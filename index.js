/*
    Copyright (C) 2022 FaiThiX

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/FaiThiX/ffxiv-linkshell-tool
*/

const fs = require('fs');
const XIVAPI = require('@xivapi/js');
const sqlite3 = require('sqlite3').verbose();

const xiv = new XIVAPI({ verbose: true });

// Names of your linkshells (case sensitive)
const linkshell = 'Serrano Hunts';


async function getcwls(_linkshell) {
    let ls = await xiv.linkshell.searchcwl(_linkshell);
    console.log(ls.Results[0]);
    fs.writeFileSync('linkshell.json', JSON.stringify(ls.Results));
    return ls;
}

async function getmembers(_linkshell) {
    let members = [];
    let ls = await getcwls(_linkshell);
    let _members = await xiv.linkshell.getcwl(ls.Results[0].ID);
    // console.log(_members.Linkshell.Results);
    for (let mem of _members.Linkshell.Results) {
        let obj = { name: mem.Name, id: mem.ID, server: mem.Server };
        members.push(obj);
    }
    fs.writeFileSync('members.json', JSON.stringify(members, null, 4));
    return members;
}

async function getcharacters(_linkshell) {
    let characters = [];
    let members = await getmembers(_linkshell);
    let membersslice = members.slice(0, 3);

    // Create a new database or open an existing one
    const db = new sqlite3.Database('your_database_name.db');

    // Create a table for characters
    db.run(`
        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY,
            name TEXT,
            server TEXT,
            dc TEXT,
            activejob INTEGER,
            freecompany TEXT,
            gender INTEGER,
            race INTEGER,
            title INTEGER,
            bozjanlevel INTEGER,
            elementallevel INTEGER,
            grandcompany INTEGER,
            grandcompanyrank INTEGER,
            minions INTEGER,
            mounts INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create a table for job details
    db.run(`
        CREATE TABLE IF NOT EXISTS job_details (
            id INTEGER PRIMARY KEY,
            character_id INTEGER,
            classname TEXT,
            classid INTEGER,
            level INTEGER,
            exp INTEGER,
            exptogo INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (character_id) REFERENCES characters (id)
        )
    `);

    for (let mem of membersslice) {
        let char = await xiv.character.get(mem.id, { data: 'MIMO' });
        let chardata = char.Character;
        let jobs = chardata.ClassJobs;
        let obj = {
            name: chardata.Name,
            id: chardata.ID,
            server: chardata.Server,
            dc: chardata.DC,
            activejob: chardata.ActiveClassJob.JobID,
            freecompany: chardata.FreeCompanyId,
            gender: chardata.Gender,
            race: chardata.Race,
            title: chardata.Title,
            bozjanlevel: chardata.ClassJobsBozjan.Level,
            elementallevel: chardata.ClassJobsElemental.Level,
            grandcompany: chardata.GrandCompany.NameID,
            grandcompanyrank: chardata.GrandCompany.RankID,
            minions: char.Minions.length,
            mounts: char.Mounts.length,
            jobDetails: [],
        };

        // Insert character into the characters table
        db.run(
            `
            INSERT INTO characters (
                name, server, dc, activejob, freecompany, gender, race, title,
                bozjanlevel, elementallevel, grandcompany, grandcompanyrank,
                minions, mounts, timestamp
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
            [
                obj.name,
                obj.server,
                obj.dc,
                obj.activejob,
                obj.freecompany,
                obj.gender,
                obj.race,
                obj.title,
                obj.bozjanlevel,
                obj.elementallevel,
                obj.grandcompany,
                obj.grandcompanyrank,
                obj.minions,
                obj.mounts,
            ],
            function (err) {
                if (err) {
                    console.error(err.message);
                } else {
                    const characterId = this.lastID;

                    for (let job of jobs) {
                        let jobstuff = {
                            classname: job.UnlockedState.Name,
                            classid: job.ClassID,
                            level: job.Level,
                            exp: job.ExpLevel,
                            exptogo: job.ExpLevelTogo,
                        };

                        // Insert job details into the job_details table
                        db.run(
                            `
                            INSERT INTO job_details (
                                character_id, classname, classid, level, exp, exptogo, timestamp
                            )
                            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        `,
                            [
                                characterId,
                                jobstuff.classname,
                                jobstuff.classid,
                                jobstuff.level,
                                jobstuff.exp,
                                jobstuff.exptogo,
                            ],
                            function (err) {
                                if (err) {
                                    console.error(err.message);
                                }
                            }
                        );

                        // Add each job details to the array
                        obj.jobDetails.push(jobstuff);
                    }
                }
            }
        );

        characters.push(obj);
    }

    // Close the database connection after all insertions are done
    db.close();

    fs.writeFileSync('characters.json', JSON.stringify(characters, null, 4));
    return characters;
}

getcharacters(linkshell);
