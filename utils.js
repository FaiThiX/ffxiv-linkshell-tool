require('./xivapi-extend.js')
const XIVAPI = require('@xivapi/js');
const xiv = new XIVAPI({ verbose: true });

const linkshell = 'Serrano Hunts';

async function getcwls(_linkshell) {
    let ls = await xiv.linkshell.searchcwl(_linkshell);
    return ls;
}

async function getmembers(_linkshell) {
    let members = [];
    let ls = await getcwls(_linkshell);
    let _members = await xiv.linkshell.getcwl(ls.Results[0].ID);
    for (let mem of _members.Linkshell.Results) {
        let obj = { name: mem.Name, id: mem.ID, server: mem.Server };
        members.push(obj);
    }
    return members;
}



module.exports = {
    getcwls,
    getmembers,
    linkshell
};