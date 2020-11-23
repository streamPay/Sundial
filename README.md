# DAISO: A project fundraising (Token Swap) scheme

## Background
The collapse of ICO...

The high threshold and high fees of IEO...

The practice is not good of DAICO...

With the development of Ethereum, the scene on Ethereum is developing constantly, and the number of projects is increasing. How to “find the money” has become a challenge for many projects.

## Introduce
Merge streaming money into DAICO, and Kleros solution the disputes from the project and investors. Allocate fund money to the time, and the fundraising is no longer a one-time act, but a continuing act, and investors can exit at any time. By voting, it could minimize the risk of investors' money. And introduce the Kleros to supervision the project's behavior. 

## Details
https://medium.com/@lichenguang62/streampay-kleros-daico-659e4e00145a

## Using
### Enviroment AND Tools
- `JS`
- `Metamask`
- `Kovan network`

### Install
- `npm install`
- `npm run dll`
- `npm start`

### Tutorial
1. Project input `sellTokenAddress`, `sellTokenDeposit`, `fundTokenAddress`, `fundTokenDeposit`, `startTime`, `stopTime` and `uploads project info`(pdf files) to create a project.

2. Investors could click invest button and input `investAmount` in project stream info pages, must before project startTime and investAmount % (project.stopTime - project.startTime) = 0.

3. Project withdrawl money need to proposal a voting from project stream info pages(Should click MyProjects tab and click check into stream info), investors could input `1` or `2` to vote in Vote tab(1 is pass, 2 is notPass). Project should click withdrawl button again after voting period.

4. Investors could withdrawl, cancel, create arbitration in invest stream info pages(Should click Stream tab and click check into stream info), and create arbitration should input `discription`, `uploads evidence` and pay arbitration fees. 

5. After investors created arbitration, project need pay arbitration fees for 24 hours in Arbitration info pages(Should click Arbitration tab and click check into Arbitration info). And both project and investors could uploads files to submit evidence after disputes created.

## Contact us
Email: lichenguang62@gmail.com

Github: https://github.com/Machael-lcg/DAISO

Discord：https://discord.gg/9sQCNK4
