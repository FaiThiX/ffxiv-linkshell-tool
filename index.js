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
const { randomInt } = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const utils = require('./utils');

const xiv = new XIVAPI({ verbose: true });
const db = new sqlite3.Database('test.db');


async function getcharacters(_linkshell) {
    let characters = [];
    let members = await utils.getmembers(_linkshell)
    //members = members.slice(0, 3);
    // Create a new database or open an existing one


    // Create a table for characters
    db.run(`
        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY,
            uuid INTEGER NOT NULL UNIQUE,
            charakter_id INTEGER,
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
            uuid INTEGER NOT NULL,
            classname TEXT,
            classid INTEGER,
            level INTEGER,
            exp INTEGER,
            exptogo INTEGER,
            FOREIGN KEY (uuid) REFERENCES characters (uuid)
        )
    `);

    for (let mem of members) {
        let char = await xiv.character.get(mem.id, { data: 'MIMO' });
        uuid = randomInt(10**7, 10**8-1);
        let chardata = char.Character;
        let jobs = chardata.ClassJobs;
        let obj = {
            uuid: uuid,
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
                uuid, charakter_id, name, server, dc, activejob, freecompany, gender, race, title,
                bozjanlevel, elementallevel, grandcompany, grandcompanyrank,
                minions, mounts, timestamp
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
            [
                obj.uuid,
                obj.id,
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
                                uuid, classname, classid, level, exp, exptogo
                            )
                            VALUES (?, ?, ?, ?, ?, ?)
                        `,
                            [
                                obj.uuid,
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

    //fs.writeFileSync('characters.json', JSON.stringify(characters, null, 4));
    return characters;
}

getcharacters(utils.linkshell);