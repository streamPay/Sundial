function getEv(hash,description,evidenceHash,project,invest ) {
    let ev =  {
        "fileURI": "/ipfs/" + hash,
        "fileHash": hash,
        "fileTypeExtension": "pdf",
        "category": "DAICO Behavior Violation",
        "title": "Investors invest money to project, project must be Not to misuse funds,fulfill a promise",
        "description":description,
        "aliases": {
            "invest": "Invest",
            "project":"Project"
        },
        "question":"Has the project not fulfilled its commitment and misuse of funds?",
        "rulingOptions": {
            "type": 'int',
            "precision": 'number',
            "titles": ["InvestWin", "ProjectWin"],
            "descriptions": [
                "If project fulfilled its commitment and not misuse of funds, The project win.",
                "If project not fulfilled its commitment or misuse of funds, The invest win."
            ]
        },
        "evidenceDisplayInterfaceURI":"/ipfs/" + evidenceHash,
        "evidenceDisplayInterfaceHash": evidenceHash,
    }
    return ev
}
export default getEv