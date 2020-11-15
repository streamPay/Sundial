# DAISO

## 
> Achive DAISO

## Environment
- Kovan

## Install and Start
- `npm install`
- `npm run dll`
- `npm start`

## Docs
https://medium.com/@lichenguang62/streampay-kleros-daico-659e4e00145a

## Use
1. Everyone can create projects to raise money, Create Project need SellTokenAddress, SellTokenDeposit, FundTokenAddress, FundTokenDeposit,
StartTime, StopTime.

2. Everyone can invest project except project sender, need before project startTime and invest amount % (project.stopTime - project.startTime) = 0.

3. Project withdrawl money need to proposal vote from stream balance, invest could vote according to stream balance.

4. Investors could create arbitration in Stream, it need pay arbitration fees.

5. project need  pay arbitration fees in 24 hours.
