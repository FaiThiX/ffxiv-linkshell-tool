const LinkshellLIB = require('@xivapi/js/lib/linkshell');

class Linkshell extends LinkshellLIB {
    constructor(parent) {
        super(parent);
    }

    async searchcwl(name, params={}) {
        if(typeof(name) === 'undefined')
            throw this.throwError('linkshell.searchcwl()','a name')
        return this.req('/linkshell/crossworld/search', Object.assign(params, {name}))
    }

    async getcwl(id) {
        if(typeof(id) === 'undefined')
            throw this.throwError('linkshell.getcwl()', 'an ID')
        return this.req(`/linkshell/crossworld/${id}`)
    }
}

module.exports = Linkshell;