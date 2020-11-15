module.exports = {
    parserOpts: {
        headerPattern: /^\[(\w+?)\](\[\#\d+\])?\s(.*)$/,
        headerCorrespondence: ['type', 'issue', 'subject']
    }
}
