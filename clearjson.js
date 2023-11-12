const fs = require('fs');
const path = require('path');

function processJSONFilesInFolder(folderPath) {
    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error(`Error reading folder: ${err}`);
            return;
        }

    files.forEach((file) => {
        const jsonFilePath = path.join(folderPath, file);

        fs.readFile(jsonFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading file ${jsonFilePath}: ${err}`);
                return;
            }

        try {
            const jsonData = JSON.parse(data);

            if (Object.keys(jsonData).length === 1 && jsonData['26'] && jsonData['26'].classname && Object.keys(jsonData['26']).length === 1) {
                // Delete the file if it only contains the "classname" attribute in the '26' key
                fs.unlink(jsonFilePath, (err) => {
                if (err) {
                    console.error(`Error deleting the file ${jsonFilePath}: ${err}`);
                } else {
                    console.log(`File '${jsonFilePath}' has been deleted.`);
                }
            });
            } else {
                console.log(`File '${jsonFilePath}' is not deleted.`);
            }
        } catch (error) {
            console.error(`Error parsing JSON in file ${jsonFilePath}: ${error}`);
            }
        });
    });
});
}

module.exports = processJSONFilesInFolder;
