function getGv(evidenceHash,description) {
    let gv =  {
        "fileURI": "/ipfs/" + evidenceHash,
        "fileHash": evidenceHash,
        "name": "submit evidence",
        "description": description
    }
    return gv
}
export default getGv;