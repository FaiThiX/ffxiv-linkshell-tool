const sqlite3 = require('sqlite3').verbose();
const utils = require('./utils');
const db = new sqlite3.Database('test.db');
const { randomInt } = require('crypto');
const fs = require('fs');

const uuid = randomInt(10**7, 10**8-1);


function compareObjects(obj1, obj2) {
    const differences = {};

    // Check if obj1 and obj2 have the same set of keys
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    for (const key of keys1) {
        if (!keys2.includes(key)) {
            differences[key] = {
                oldValue: obj1[key],
                newValue: undefined,
            };
        } else if (obj1[key] !== obj2[key]) {
            differences[key] = {
                oldValue: obj1[key],
                newValue: obj2[key],
            };
        }
    }

    for (const key of keys2) {
        if (!keys1.includes(key)) {
            differences[key] = {
                oldValue: undefined,
                newValue: obj2[key],
            };
        }
    }

    return differences;
}

async function compare(_linkshell) {
    let members = await utils.getmembers(_linkshell);
    //members = members.slice(0, 1);
    
    for (let mem of members) {
        const characters = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM characters WHERE charakter_id = ${mem.id} ORDER BY timestamp DESC LIMIT 2`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        const combinedDataArray = [];

        for (let character of characters) {
            const row2 = await new Promise((resolve, reject) => {
                db.all(`SELECT * FROM job_details WHERE uuid = ${character.uuid}`, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

            character.classes = row2; // Add classes as an attribute of the character

            // Delete 'uuid' and 'id' properties from the character object
            delete character.uuid;
            delete character.id;
            delete character.timestamp;

            // Iterate through the 'classes' array and delete 'uuid' and 'id' properties from each class object
            character.classes.forEach(classObj => {
                delete classObj.uuid;
                delete classObj.id;
            });

            combinedDataArray.push(character);
        }

        // Compare changes in the classes array based on classid
        const changes = compareObjects(combinedDataArray[1], combinedDataArray[0]);
        const classChanges = {};

        for (const class1 of combinedDataArray[0].classes) {
            const class2 = combinedDataArray[1].classes.find(c => c.classid === class1.classid);

            if (!class2) {
                classChanges[class1.classid] = {
                    oldValue: class1,
                    newValue: null,
                };
            } else {
                const classDiff = compareObjects(class1, class2);
                if (Object.keys(classDiff).length > 0) {
                    classChanges[class1.classid] = classDiff;
                }
            }
        }

        if (Object.keys(changes).includes('classes')) {
            delete changes.classes;
        }

        // Check if the folder exists
        if (!fs.existsSync(`./${uuid}`)) {
            // Create the folder if it doesn't exist
            fs.mkdirSync(`./${uuid}`);
        }

        if (Object.keys(changes).length > 0) {
            console.log('Character Changes:', JSON.stringify(changes, null, 4));
            fs.writeFileSync(`./${uuid}/characterChanges-${mem.name}.json`, JSON.stringify(changes, null, 4));
        }

        console.log('Class Changes:', JSON.stringify(classChanges, null, 4));
        fs.writeFileSync(`./${uuid}/classChanges-${mem.name}.json`, JSON.stringify(classChanges, null, 4));
    }
}

compare(utils.linkshell);
