pragma solidity 0.5.16;

import "../node_modules/@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "./tools-contracts/OwnableWithoutRenounce.sol";
import "./tools-contracts/PausableWithoutRenounce.sol";
import "./tools-contracts/SafeMath.sol";

import './Types.sol';

import "./interface/DAISOInterface.sol";
import "./interface/IArbitrator.sol";
import "./interface/IArbitrable.sol";
import "./interface/erc-1497/IEvidence.sol";

/**
 * @title DAISO: StreamPay + Kleros + DAICO
 * @author StreamPay
 */

contract DAISO is IArbitrable, IEvidence, OwnableWithoutRenounce, PausableWithoutRenounce, ReentrancyGuard, DAISOInterface{
    using SafeMath for uint256;

    /*** Storage Properties ***/

    /**
     * @notice Counter for invest stream ids.
     */
    uint256 public nextStreamId;

    /**
     * @notice Counter for project stream ids.
     */
    uint256 public nextProjectId;

    /**
     * @notice Address of IArbitrator.
     */
    address arbitratorAddress;

    /**
     * @notice The invest stream objects identifiable by their unsigned integer ids.
     */
    mapping(uint256 => Types.Stream) public streams;

    /**
     * @notice The project stream objects identifiable by their unsigned integer ids.
     */
    mapping(uint256 => Types.Project) public projects;

    /**
     * @notice State changed when the invest cancel streams, The Status identifiable by their unsigned integer ids.
     */
    mapping(uint256 => Types.CancelProjectForInvest) public cancelProjectForInvests;

    /**
     * @notice The Proposal objects identifiable by their unsigned integer ids.
     */
    mapping(uint256 => Types.Proposal) public proposals;

    /**
     * @notice The arbitration objects identifiable by their unsigned integer ids.
     */
    mapping(uint256 => Types.Arbitration) public arbitrations;

    /**
     * @notice The disputeID identifiable by their unsigned integer ids.
     */
    mapping(uint256 => uint256) public disputeIDtoArbitrationID;

    /**
     * @dev Throws if the caller is not the sender of the invest stream.
     */
    modifier onlyInvest(uint256 streamId) {
        require(
            msg.sender == streams[streamId].sender,
            "1"
        );
        _;
    }

    /**
     * @dev Throws if the caller is not the sender of the project stream.
     */
    modifier onlyProject(uint256 projectId) {
        require(
            msg.sender == projects[projectId].sender,
            "2"
        );
        _;
    }

    /**
     * @dev Throws if the stream id does not point to a valid stream.
     */
    modifier investExists(uint256 streamId) {
        require(streams[streamId].sender != address(0x0), "3");
        _;
    }

    /**
     * @dev Throws if the project id does not point to a valid stream.
     */
    modifier projectExists(uint256 projectId) {
        require(projects[projectId].sender != address(0x0), "4");
        _;
    }

    /*** Contract Logic Starts Here */

    constructor() public {
        OwnableWithoutRenounce.initialize(msg.sender);
        PausableWithoutRenounce.initialize(msg.sender);
        arbitratorAddress = address(0x6A498861dD1f4e9C58Aa6a5Eee34C45aA890Df9E);
        nextStreamId = 1;
        nextProjectId = 1;
    }

    /*** Project Functions ***/

    /**
     * @notice Creates a new project stream for sell xDAI to fund DAI.
     * @dev Throws if paused.
     *  Throws if the projectSellTokenAddress is same the projectFundTokenAddress.
     *  Throws if the projectSellDeposit is 0.
     *  Throws if the projectFundDeposit is 0.
     *  Throws if the start time is before `block.timestamp`.
     *  Throws if the stop time is before the start time.
     *  Throws if the lockPeriod is 0.
     *  Throws if the duration calculation has a math error.
     *  Throws if the projectSellDeposit is not multiple of time delta.
     *  Throws if the projectFundDeposit is not multiple of time delta.
     *  Throws if the projectId calculation has a math error.
     *  Throws if the contract is not allowed to transfer enough tokens.
     *  Throws if there is a token transfer failure.
     * @param projectSellTokenAddress The address of project sell.
     * @param projectSellDeposit The amount of project sell.
     * @param projectFundTokenAddress The address of project fund.
     * @param projectFundDeposit The amount of project fund.
     * @param startTime The unix timestamp for when the stream starts.
     * @param stopTime The unix timestamp for when the stream stops.
     * @param lockPeriod The amount of lockPeriod and the uint is seconds.
     * @param hash The ipfs hash for project info and promise submitted by the Project Party.
     * @return The uint256 id of the project stream.
     */
    function createProject(address projectSellTokenAddress, uint256 projectSellDeposit, address projectFundTokenAddress,
        uint256 projectFundDeposit, uint256 startTime, uint256 stopTime, uint256 lockPeriod, string calldata hash)
        external
        whenNotPaused
        returns (uint256)
    {
        require(projectSellTokenAddress != projectFundTokenAddress,"5");
        require(projectSellDeposit > 0,"6");
        require(projectFundDeposit > 0,"7");
        require(startTime >= block.timestamp, "8");
        require(stopTime > startTime, "9");
        require(lockPeriod > 0, "56");

        uint256 duration = stopTime.sub(startTime);
        require(projectSellDeposit % duration == 0, "10");
        require(projectFundDeposit % duration == 0, "11");

        uint256 projectId = nextProjectId;

        projects[projectId] = Types.Project({
            projectSellDeposit: projectSellDeposit,
            projectFundDeposit: projectFundDeposit,
            projectActualSellDeposit: 0,
            projectActualFundDeposit: 0,
            projectWithdrawalAmount:0,
            sender: msg.sender,
            startTime: startTime,
            stopTime: stopTime,
            projectSellTokenAddress: projectSellTokenAddress,
            projectFundTokenAddress: projectFundTokenAddress,
            streamId: new uint256[](0),
            duration: duration,
            lockPeriod: lockPeriod
        });

        cancelProjectForInvests[projectId].exitStartTime = startTime;
        cancelProjectForInvests[projectId].exitStopTime = stopTime;

        nextProjectId = nextProjectId + 1;

        require(IERC20(projectSellTokenAddress).transferFrom(msg.sender, address(this), projectSellDeposit), "12");
        emit CreateProject(projectId, msg.sender, hash);
        return projectId;
    }

    /**
     * @notice Returns either the delta in seconds between `block.timestamp` and `exitStartTime` or
     *  between `exitStopTime` and `exitStartTime`, whichever is smaller. If `block.timestamp` is starts before
     *  `exitStartTime`, it returns 0.
     * The exitStartTime is last investor to exit time.The initial value is startTime.
      * The exitStopTime is project.stopTime. If project loss the arbitration, the exitStopTime will changed.
     * @param projectId The id of the project stream for which to query the delta.
     * @return The time delta in seconds.
     */
    function deltaOfForProject(uint256 projectId) public view returns (uint256 delta) {
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];

        if (block.timestamp <= cancelProjectForInvest.exitStartTime) return 0;
        if (block.timestamp < cancelProjectForInvest.exitStopTime) return block.timestamp - cancelProjectForInvest.exitStartTime;
        return cancelProjectForInvest.exitStopTime - cancelProjectForInvest.exitStartTime;
    }

    /**
     * @notice Returns the sellToken balance and fundToken balance for project.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the balance.
     * @return The stream balance for project SellToken.
     * @return The stream balance for project FundToken.
     */
    function projectBalanceOf(uint256 projectId) public view projectExists(projectId) returns (uint256 projectSellBalance, uint256 projectFundBalance) {
        Types.Project storage project = projects[projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];

        uint256 duration = project.stopTime.sub(cancelProjectForInvest.exitStartTime);

        /* actual fund deposit minus the already stream fund deposit*/
        uint256 remainOfFundStream = project.projectActualFundDeposit.sub(cancelProjectForInvest.exitProjectFundBalance);

        /* unStream deposit div noStream duration is new ratePerSecond */
        uint256 ratePerSecondOfProjectFund = remainOfFundStream.div(duration);

        uint256 delta = deltaOfForProject(projectId);
        projectFundBalance = delta.mul(ratePerSecondOfProjectFund);

        projectFundBalance = cancelProjectForInvest.exitProjectFundBalance.add(projectFundBalance);

        if(block.timestamp >= cancelProjectForInvest.exitStopTime){
            /* This calculation dealing with remainders */
            uint256 remainderOfProjectFund = remainOfFundStream.mod(duration);

            projectFundBalance = remainderOfProjectFund.add(projectFundBalance);
        }

        projectFundBalance = projectFundBalance.sub(project.projectWithdrawalAmount);

        /* actual sell deposit minus the already stream sell deposit*/
        uint256 remainOfSellStream = project.projectActualSellDeposit.sub(cancelProjectForInvest.exitProjectSellBalance);

        /* unStream deposit div noStream duration is new ratePerSecond */
        uint256 ratePerSecondOfProjectSell = remainOfSellStream.div(duration);

        projectSellBalance = delta.mul(ratePerSecondOfProjectSell);

        /* unStream deposit minus new already stream */
        projectSellBalance = remainOfSellStream.sub(projectSellBalance);

        if(block.timestamp >= cancelProjectForInvest.exitStopTime){
            uint256 remainderOfProjectSell = remainOfSellStream.mod(duration);

            projectSellBalance = projectSellBalance.sub(remainderOfProjectSell);
        }

        return (projectSellBalance,projectFundBalance);
    }

    /**
     * @notice Project refund sellToken for Unsold and must exceed project stopTime + lock period!
     * @dev Throws if the project id does not point to a valid project stream.
     * Throws if the caller is not the sender of the project stream
     * Throws if now time smaller than project stopTime.
     * @param projectId The id of the project stream for refunds.
     * @return bool true=success, otherwise false.
     */
    function projectRefunds(uint256 projectId)
        external
        nonReentrant
        projectExists(projectId)
        onlyProject(projectId)
        returns (bool)
    {
        Types.Project storage project = projects[projectId];

        require(block.timestamp >= project.stopTime.add(project.lockPeriod),"13");

        uint256 refunds = project.projectSellDeposit.sub(project.projectActualSellDeposit);
        (uint256 projectSellBalance,uint256 projectFundBalance) = projectBalanceOf(projectId);

        projectSellBalance = refunds.add(projectSellBalance);

        if (projectSellBalance > 0)
            require(IERC20(project.projectSellTokenAddress).transfer(project.sender, projectSellBalance), "14");
        if (projectFundBalance > 0)
            require(IERC20(project.projectFundTokenAddress).transfer(project.sender, projectFundBalance), "15");

        emit CancelProjectForProject(projectId, projectSellBalance, projectFundBalance);
        return true;
    }

    /**
     * @notice Project release a withdraw apply for vote by investors.
     * @dev Throws if the proposal.startTime is not zero.
     *  Throws if the project id does not point to a valid project stream.
     *  Throws if the caller is not the sender of the project stream
     *  Throws if the amount is zero.
     *  Throws if the amount exceeds the available balance.
     * @param projectId The id of the project stream for launchProposal.
     * @param amount The amount of tokens to withdraw.
     * @return bool true=success, otherwise false.
     */
    function launchProposal (uint256 projectId, uint256 amount)
        external
        projectExists(projectId)
        onlyProject(projectId)
        returns(bool)
    {
        Types.Proposal storage proposal = proposals[projectId];
        Types.Project storage project = projects[projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];

        require(amount > 0, "16");
        require(proposal.startTime == 0,"17");

        (,uint256 balance) = projectBalanceOf(projectId);
        require(balance >= amount, "18");

        uint256 delta;
        if (block.timestamp <= project.startTime) {
            delta = 0;
        } else if (block.timestamp < cancelProjectForInvest.exitStopTime) {
            delta = block.timestamp - project.startTime;
        } else {
            delta = cancelProjectForInvest.exitStopTime - project.startTime;
        }

        proposals[projectId] = Types.Proposal({
            amount: amount,
            startTime: block.timestamp,
            delta: delta
        });

        return true;
    }

    /**
     * @notice investor vote for proposal of project's withdraw.
     * @dev Throws if the proposal.startTime is zero.
     *  Throws if the now not exceeds proposals start time.
     *  Throws if the now exceeds proposals start time + 600.
     * @param streamId The id of the investor stream for vote.
     * @param voteResult The result of vote. pass is 1, notPass is 2.
     * @return bool true=success, otherwise false.
     */
    function voteForInvest (uint256 streamId, uint256 voteResult)
        external
        investExists(streamId)
        onlyInvest(streamId)
        returns(bool)
    {
        Types.Stream storage stream = streams[streamId];
        Types.Proposal storage proposal = proposals[stream.projectId];

        require(proposals[stream.projectId].startTime != 0,"19");
        require(block.timestamp < proposals[stream.projectId].startTime + 600,"20");
        require(stream.isVote == Types.IsVote.NoVote,"21");
        require(voteResult == 1 || voteResult == 2,"55");

        uint256 investFundBalance= proposal.delta.mul(stream.ratePerSecondOfInvestFund);
        investFundBalance = investFundBalance.sub(stream.investWithdrawalAmount);

        streams[streamId].voteWight = investFundBalance;
        if (voteResult == 1) {
            streams[streamId].voteResult = Types.VoteResult.Pass;
        } else if (voteResult == 2) {
            streams[streamId].voteResult = Types.VoteResult.NotPass;
        }
        streams[streamId].isVote = Types.IsVote.Voted;

        emit VoteForInvest(stream.projectId, streamId, voteResult, investFundBalance);
        return true;
    }

    /**
     * @notice project withdraw when now exceeds vote stop time. Withdrawl success when vote pass, Withdrawl failure when vote notPass.
     * @dev Throws if the proposal.startTime is zero.
     *  Throws if the Types.Status is Disputed.
     *  Throws if the project id does not point to a valid project stream.
     *  Throws if the project.proposalForCancelStatus is one.
     *  Throws if the now not exceeds proposal.starttime + 600(vote time).
     * @param projectId The id of the project stream for Withdrawl.
     * @return bool true=success, otherwise false.
     * @return pass that how many vote weight.
     * @return notPass that how many vote weight.
     */
    function votingResult(uint256 projectId)
        external
        whenNotPaused
        nonReentrant
        projectExists(projectId)
        onlyProject(projectId)
        returns(bool,uint256,uint256)
    {
        Types.Proposal storage proposal = proposals[projectId];
        Types.Project storage project = projects[projectId];

        require(proposal.startTime != 0,"22");
        require(arbitrations[projectId].status != Types.Status.Disputed,"23");
        require(cancelProjectForInvests[projectId].proposalForCancelStatus != 1,"24");
        require(block.timestamp >= proposal.startTime + 600,"25");

        bool result;
        uint256 pass;
        uint256 notPass;

        for(uint i = 0; i < project.streamId.length; i++) {
            Types.Stream storage stream = streams[project.streamId[i]];

            if (stream.isVote == Types.IsVote.Voted){
                if (stream.voteResult == Types.VoteResult.Pass) {
                    pass = pass + stream.voteWight;
                    streams[project.streamId[i]].isVote = Types.IsVote.NoVote;
                } else if (stream.voteResult == Types.VoteResult.NotPass) {
                    notPass = notPass + stream.voteWight;
                    streams[project.streamId[i]].isVote = Types.IsVote.NoVote;
                }
            }
        }

        if (pass >= notPass) {
            projects[projectId].projectWithdrawalAmount = project.projectWithdrawalAmount.add(proposal.amount);
            require(IERC20(project.projectFundTokenAddress).transfer(project.sender, proposal.amount), "26");
            emit WithdrawFromProject(projectId, proposal.amount, pass, notPass);
            result = true;
        } else if (pass < notPass) {
            result = false;
        }
        delete proposals[projectId];
        return (result,pass,notPass);
    }

    /*** Investor Functions ***/

    /**
     * @notice Creates a new stream for invest project by investors;.
     * @dev Throws if paused.
     *  Throws if the caller is project.
     *  Throws if the investSellDeposit is 0.
     *  Throws if the now is before project start time.
     *  Throws if the investSellDeposit is not a multiple of the duration.
     *  Throws if the projectActualFundDeposit calculation has a math error.
     *  Throws if the projectActualSellDeposit calculation has a math error.
     *  Throws if the ratePerSecondOfProjectSell calculation has a math error.
     *  Throws if the ratePerSecondOfProjectFund calculation has a math error.
     *  Throws if the investFundDeposit calculation has a math error.
     *  Throws if the ratePerSecondOfInvestSell calculation has a math error.
     *  Throws if the ratePerSecondOfInvestFund calculation has a math error.
     *  Throws if the contract is not allowed to transfer enough tokens.
     *  Throws if there is a token transfer failure.
     *  Throws if the projectFundDeposit is smaller than projectActualFundDeposit.
     * @param projectId The id of the project stream for investors create.
     * @param investSellDeposit The amount of money to be invested.
     * @return The uint256 id of the newly created invest stream.
     */
    function createStream(uint256 projectId, uint256 investSellDeposit)
        external
        whenNotPaused
        returns (uint256)
    {
        Types.Project storage project = projects[projectId];

        require(msg.sender != project.sender,"27");
        require(investSellDeposit > 0, "28");
        require(block.timestamp <= projects[projectId].startTime,"29");
        require(investSellDeposit % project.duration == 0, "30");

        projects[projectId].projectActualFundDeposit = project.projectActualFundDeposit.add(investSellDeposit);
        require(project.projectFundDeposit >= projects[projectId].projectActualFundDeposit, "31");

        uint256 projectActualSellDeposit = projects[projectId].projectActualFundDeposit.mul(project.projectSellDeposit);
        projects[projectId].projectActualSellDeposit = projectActualSellDeposit.div(project.projectFundDeposit);

        uint256 investFundDeposit = investSellDeposit.mul(project.projectSellDeposit);
        investFundDeposit = investFundDeposit.div(project.projectFundDeposit);

        uint256 ratePerSecondOfInvestSell = investSellDeposit.div(project.duration);
        uint256 ratePerSecondOfInvestFund = investFundDeposit.div(project.duration);

        uint256 streamId = nextStreamId;

        streams[streamId] = Types.Stream({
            projectId: projectId,
            investSellDeposit: investSellDeposit,
            investFundDeposit: investFundDeposit,
            ratePerSecondOfInvestSell: ratePerSecondOfInvestSell,
            ratePerSecondOfInvestFund: ratePerSecondOfInvestFund,
            sender: msg.sender,
            investWithdrawalAmount:0,
            voteWight:0,
            voteResult:Types.VoteResult.NotPass,
            isVote: Types.IsVote.NoVote
        });

        projects[projectId].streamId.push(streamId);

        nextStreamId = nextStreamId + 1;

        require(IERC20(project.projectFundTokenAddress).transferFrom(msg.sender, address(this), investSellDeposit), "32");
        emit CreateStream(streamId, msg.sender);
        return streamId;
    }


    /**
     * @notice Returns either the delta in seconds between `block.timestamp` and `startTime` or
     *  between `exitStopTime` and `startTime, whichever is smaller. If `block.timestamp` iis starts before
     *  `startTime`, it returns 0.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the stream for which to query the delta.
     * @return The time delta in seconds.
     */
    function deltaOf(uint256 streamId) public view returns (uint256 delta) {
        Types.Project storage project = projects[streams[streamId].projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[streams[streamId].projectId];

        if (block.timestamp <= project.startTime) return 0;
        if (block.timestamp < cancelProjectForInvest.exitStopTime) return block.timestamp - project.startTime;
        return cancelProjectForInvest.exitStopTime - project.startTime;
    }

    /**
     * @notice Returns the sellToken balance and fundToken balance for invest.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the invest stream for balance.
     * @return The stream balance for invest SellToken.
     * @return The stream balance for invest FundToken.
    */
    function investBalanceOf(uint256 streamId) public view investExists(streamId) returns (uint256 investSellBalance, uint256 investFundBalance) {
        Types.Stream storage stream = streams[streamId];

        uint256 delta = deltaOf(streamId);
        investFundBalance = delta.mul(stream.ratePerSecondOfInvestFund);

        investFundBalance = investFundBalance.sub(stream.investWithdrawalAmount);

        investSellBalance = delta.mul(stream.ratePerSecondOfInvestSell);
        investSellBalance = stream.investSellDeposit.sub(investSellBalance);

        return (investSellBalance,investFundBalance);
    }

    /**
     * @notice Withdraws from the contract to the investor's account.
     * @dev Throws if the id does not point to a valid stream.
     *  Throws if caller is not invest.
     *  Throws if the amount exceeds the available balance.
     *  Throws if there is a token transfer failure.
     * @param streamId The id of the stream to withdraw tokens from.
     * @param amount The amount of tokens to withdraw.
     * @return bool true=success, otherwise false.
     */
    function withdrawFromInvest(uint256 streamId, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        investExists(streamId)
        onlyInvest(streamId)
        returns (bool)
    {
        require(amount > 0, "33");
        (,uint256 balance) = investBalanceOf(streamId);
        require(balance >= amount, "34");

        Types.Stream storage stream = streams[streamId];
        Types.Project storage project = projects[stream.projectId];

        streams[streamId].investWithdrawalAmount = stream.investWithdrawalAmount.add(amount);

        require(IERC20(project.projectSellTokenAddress).transfer(stream.sender, amount), "35");
        emit WithdrawFromInvest(streamId, stream.projectId, stream.sender, amount);

        return true;
    }

    /**
     * @notice Cancels the invest stream and transfers the tokens back to invest.
     * @dev Throws if the id does not point to a valid stream.
     *  Throws if caller is not the sender of the invest stream.
     *  Throws if there is a token transfer failure.
     * @param streamId The id of the invest stream to cancel.
     * @return bool true=success, otherwise false.
     */
    function cancelInvest(uint256 streamId)
        external
        nonReentrant
        investExists(streamId)
        onlyInvest(streamId)
        returns (bool)
    {
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[streams[streamId].projectId];

        if (cancelProjectForInvest.proposalForCancelStatus != 1){
            /* cancel due invest reason*/
            cancelInvestInternal(streamId);
            return true;
        } else {
            /* cancel due project reason*/
            cancelProjectInternal(streamId);
            return true;
        }
    }

    /**
     * @notice investor cancels the stream and transfers the tokens back to invest.
     * @dev Throws if the exitProjectSellBalance calculation has a math error.
     * Throws if the projectActualFundDeposit calculation has a math error.
     * Throws if the projectActualSellDeposit calculation has a math error.
     * Throws if the exitProjectFundBalance calculation has a math error.
     * Throws if the exitProjectSellBalance calculation has a math error.
     *  Throws if there is a projectFund token transfer failure.
     *  Throws if there is a projectSell token transfer failure.
     */
    function cancelInvestInternal(uint256 streamId) internal {
        Types.Stream storage stream = streams[streamId];
        Types.Project storage project = projects[stream.projectId];

        for(uint i = 0; i < project.streamId.length; i++){
            if (project.streamId[i] == streamId)
                delete project.streamId[i];
        }
        uint256 investSellBalance;
        uint256 investFundBalance;

        if (block.timestamp < project.stopTime) {
            (uint256 projectSellBalance,uint256 projectFundBalance) = projectBalanceOf(stream.projectId);

            /* already stream fund deposit*/
            cancelProjectForInvests[stream.projectId].exitProjectFundBalance = projectFundBalance.add(project.projectWithdrawalAmount);
            /* already stream sell deposit*/
            cancelProjectForInvests[stream.projectId].exitProjectSellBalance = project.projectActualSellDeposit.sub(projectSellBalance);

            if (block.timestamp > project.startTime) {
                cancelProjectForInvests[stream.projectId].exitStartTime = block.timestamp;
            }

            (investSellBalance,investFundBalance) = investBalanceOf(streamId);

            projects[stream.projectId].projectActualFundDeposit = project.projectActualFundDeposit.sub(investSellBalance);

            uint256 projectActualSellDeposit = projects[stream.projectId].projectActualFundDeposit.mul(project.projectSellDeposit);
            projects[stream.projectId].projectActualSellDeposit = projectActualSellDeposit.div(project.projectFundDeposit);
        } else {
            (investSellBalance, investFundBalance) = investBalanceOf(streamId);
        }

        if (investSellBalance > 0)
            require(IERC20(project.projectFundTokenAddress).transfer(stream.sender, investSellBalance), "36");
        if (investFundBalance > 0)
            require(IERC20(project.projectSellTokenAddress).transfer(stream.sender, investFundBalance), "37");

        delete streams[streamId];

        emit CancelStream(stream.projectId, streamId, stream.sender, investSellBalance, investFundBalance, block.timestamp);
    }

    /**
     * @notice investor cancels the stream and transfers the tokens back to invest.
     * Just open when project loss Arbitration, project fundToken balance will refunds to investors according to percent for
     * (investSellDeposit / sumForInvestSellDeposit)
     * @dev Throws if the sumForInvestSellDeposit calculation has a math error.
     * Throws if the amount calculation has a math error.
     * Throws if the investSellBalance calculation has a math error.
     *  Throws if there is a projectFund token transfer failure.
     *  Throws if there is a projectSell token transfer failure.
     */
    function cancelProjectInternal(uint256 streamId) internal {
        Types.Stream storage stream = streams[streamId];
        Types.Project storage project = projects[stream.projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[stream.projectId];

        (,uint256 projectFundBalance) = projectBalanceOf(stream.projectId);

        uint256 amount = projectFundBalance.mul(stream.investSellDeposit);
        amount = amount.div(cancelProjectForInvest.sumForInvestSellDeposit);

        (uint256 investSellBalance,uint256 investFundBalance) = investBalanceOf(streamId);

        investSellBalance = amount.add(investSellBalance);

        if (investSellBalance > 0)
            require(IERC20(project.projectFundTokenAddress).transfer(stream.sender, investSellBalance), "38");
        if (investFundBalance > 0)
            require(IERC20(project.projectSellTokenAddress).transfer(stream.sender, investFundBalance), "39");

        delete streams[streamId];

        emit CancelProject(stream.projectId, streamId, stream.sender, investSellBalance, investFundBalance,amount,block.timestamp);
    }

    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for getProject info.
     * @return The project object.
     */
    function getProject(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (
            uint256 projectSellDeposit,
            uint256 projectFundDeposit,
            uint256 projectActualSellDeposit,
            uint256 projectActualFundDeposit,
            uint256 projectWithdrawalAmount,
            address payable sender,
            uint256 startTime,
            uint256 stopTime,
            address projectSellTokenAddress,
            address projectFundTokenAddress,
            uint256 lockPeriod
        )
    {
        projectSellDeposit = projects[projectId].projectSellDeposit;
        projectFundDeposit = projects[projectId].projectFundDeposit;
        projectActualSellDeposit = projects[projectId].projectActualSellDeposit;
        projectActualFundDeposit = projects[projectId].projectActualFundDeposit;
        projectWithdrawalAmount = projects[projectId].projectWithdrawalAmount;
        sender = projects[projectId].sender;
        startTime = projects[projectId].startTime;
        stopTime = projects[projectId].stopTime;
        projectSellTokenAddress = projects[projectId].projectSellTokenAddress;
        projectFundTokenAddress = projects[projectId].projectFundTokenAddress;
        lockPeriod = projects[projectId].lockPeriod;
    }

    /**
     * @notice Returns the stream with all its properties.
     * @dev Throws if the stream id does not point to a valid invest stream.
     * @param streamId The id of the invest stream for get stream info.
     * @return The stream object.
     */
    function getStream(uint256 streamId)
        external
        view
        investExists(streamId)
        returns (
            uint256 projectId,
            uint256 investSellDeposit,
            uint256 investFundDeposit,
            address sender,
            uint256 investWithdrawalAmount,
            uint256 ratePerSecondOfInvestSell,
            uint256 ratePerSecondOfInvestFund,
            uint256 voteWight,
            Types.VoteResult voteResult,
            Types.IsVote isVote
        )
    {
        projectId = streams[streamId].projectId;
        investSellDeposit = streams[streamId].investSellDeposit;
        investFundDeposit = streams[streamId].investFundDeposit;
        sender = streams[streamId].sender;
        investWithdrawalAmount = streams[streamId].investWithdrawalAmount;
        ratePerSecondOfInvestSell = streams[streamId].ratePerSecondOfInvestSell;
        ratePerSecondOfInvestFund = streams[streamId].ratePerSecondOfInvestFund;
        voteWight = streams[streamId].voteWight;
        voteResult = streams[streamId].voteResult;
        isVote = streams[streamId].isVote;
    }

    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for get CancelProjectForInvest info.
     * @return The CancelProjectForInvest object.
     */
    function getCancelProjectForInvestAndProposal(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (
            uint256 exitProjectSellBalance,
            uint256 exitProjectFundBalance,
            uint256 exitStartTime,
            uint256 exitStopTime,
            uint256 proposalForCancelStatus,
            uint256 amount,
            uint256 startTime
        )
    {
        exitProjectSellBalance = cancelProjectForInvests[projectId].exitProjectSellBalance;
        exitProjectFundBalance = cancelProjectForInvests[projectId].exitProjectFundBalance;
        exitStartTime = cancelProjectForInvests[projectId].exitStartTime;
        exitStopTime = cancelProjectForInvests[projectId].exitStopTime;
        proposalForCancelStatus = cancelProjectForInvests[projectId].proposalForCancelStatus;
        amount = proposals[projectId].amount;
        startTime = proposals[projectId].startTime;
    }

    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for get proposal info.
     * @return The Proposal object.
     */
    function getProposal(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (
            uint256 amount,
            uint256 startTime,
            uint256 delta
        )
    {
        amount = proposals[projectId].amount;
        startTime = proposals[projectId].startTime;
        delta = proposals[projectId].delta;
    }

    /**
     * @notice invest create arbitration with project.
     * @param projectId The id of the project to create arbitration.
     * @param _metaEvidence The metaEvidence of arbitration.
     */
    function createArbitrationForInvestor(
        uint256 projectId,
        string memory _metaEvidence
    ) public projectExists(projectId) payable {
        /* verify msg.value is same as arbitrationCost*/
        require(msg.value == IArbitrator(arbitratorAddress).arbitrationCost(""),"40");

        Types.Project storage project = projects[projectId];

        require(arbitrations[projectId].reclaimedAt == 0,"41");
        require(block.timestamp >= project.startTime,"42");
        require(block.timestamp < cancelProjectForInvests[projectId].exitStopTime,"43");

        arbitrations[projectId] = Types.Arbitration({
            invest: msg.sender,
            project: project.sender,
            status: Types.Status.Reclaimed,
            disputeID: 0,
            reclaimedAt: block.timestamp,
            feeDeposit: msg.value,
            projectFeeDeposit: 0
        });

        emit MetaEvidence(projectId, _metaEvidence);
        emit Arbitration(projectId, _metaEvidence, project.sender, msg.sender,msg.value, block.timestamp);
    }

    /**
     * @notice investor reclaim funds when project not pay arbitration fee.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the arbitrations[projectId].status is not Reclaimed.
     *  Throws if the caller is not arbitration.invest.
     *  Throws if the now not exceeds arbitration.reclaimedAt + 86400(reclaimed time).
     * @param projectId The id of the project arbitration for which to query the delta.
     */
    function reclaimFunds(uint256 projectId)  external returns(bool result){
        Types.Arbitration storage arbitration = arbitrations[projectId];
        Types.Project storage project = projects[projectId];

        require(arbitration.status == Types.Status.Reclaimed,"44");
        require(block.timestamp - arbitration.reclaimedAt > 86400,"46");

        if (block.timestamp <= cancelProjectForInvests[projectId].exitStopTime) {
            cancelProjectForInvests[projectId].exitStopTime = block.timestamp;
        }
        cancelProjectForInvests[projectId].proposalForCancelStatus = 1;

        uint256 sumForInvestSellDeposit;
        for(uint i = 0; i < project.streamId.length; i++){
            if (project.streamId[i] != 0) {
                sumForInvestSellDeposit = sumForInvestSellDeposit.add(streams[project.streamId[i]].investSellDeposit);
            }
        }
        cancelProjectForInvests[projectId].sumForInvestSellDeposit = sumForInvestSellDeposit;

        result = arbitration.invest.send(arbitration.feeDeposit);
        delete arbitrations[projectId];

        return result;
    }

    /**
     * @notice project pay arbitration fee.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the arbitration.status is not Reclaimed.
     *  Throws if the now exceeds arbitration.reclaimedAt + 86400(reclaimed time).
     * @param projectId The id of the project arbitration for which to query the delta.
     */
    function createDisputeForProject(uint256 projectId) external payable returns(bool) {
        Types.Arbitration storage arbitration = arbitrations[projectId];

        /* verify msg.value is same as arbitrationCost*/
        require(msg.value == IArbitrator(arbitratorAddress).arbitrationCost(""),"47");
        require(arbitration.status == Types.Status.Reclaimed, "48");
        require(block.timestamp - arbitration.reclaimedAt <= 86400,"49");

        arbitrations[projectId].projectFeeDeposit = msg.value;
        arbitrations[projectId].disputeID = IArbitrator(arbitratorAddress).createDispute.value(msg.value)(2, "");
        arbitrations[projectId].status = Types.Status.Disputed;

        disputeIDtoArbitrationID[arbitration.disputeID] = projectId;
        emit Dispute(IArbitrator(arbitratorAddress), arbitration.disputeID, projectId, projectId);
        return true;
    }

    /**
     * @notice IArbitrator Execute ruling.
     * @dev Throws if the caller not the arbitratorAddress.
     *  Throws if the arbitration.status is not Disputed.
     *  Throws if the _ruling is bigger than 2.
     * @param _disputeID The id of the dispute object for which to query the delta.
     * @param _ruling The result of Irabitrator.
     */
    function rule(uint256 _disputeID, uint256 _ruling) external {
        uint256 projectId = disputeIDtoArbitrationID[_disputeID];

        Types.Arbitration storage arbitration = arbitrations[projectId];
        Types.Project storage project = projects[projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];

        require(msg.sender == arbitratorAddress, "50");
        require(arbitration.status == Types.Status.Disputed, "51");
        require(_ruling <= 2, "52");

        bool result;
        if (_ruling == 1) {
            uint256 sumForInvestSellDeposit;
            for(uint i = 0; i < project.streamId.length; i++){
                if (project.streamId[i] != 0) {
                    sumForInvestSellDeposit = sumForInvestSellDeposit.add(streams[project.streamId[i]].investSellDeposit);
                }
            }
            cancelProjectForInvests[projectId].sumForInvestSellDeposit = sumForInvestSellDeposit;
            cancelProjectForInvests[projectId].proposalForCancelStatus = 1;

            if (block.timestamp <= cancelProjectForInvest.exitStopTime) {
                cancelProjectForInvests[projectId].exitStopTime = block.timestamp;
            }

            result = arbitration.invest.send(arbitration.feeDeposit);
        } else if (_ruling == 2) {
            cancelProjectForInvests[projectId].proposalForCancelStatus = 2;
            result = arbitration.project.send(arbitration.feeDeposit);
        } else if (_ruling == 0) {
            uint256 fee = arbitration.feeDeposit.div(2);
            result = arbitration.invest.send(fee);
            result = arbitration.project.send(fee);
        }

        delete arbitrations[projectId];

        emit Ruling(IArbitrator(msg.sender), _disputeID, _ruling);
    }

    /**
     * @notice project or investors submit evidence.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the transaction.status is Resolved.
     *  Throws if the caller is not investors or project.
     * @param projectId The id of the project arbitration for which to query the delta.
     * @param _evidence The _evidence of arbitration.
     */
    function submitEvidence(uint256 projectId, string calldata _evidence) external {
        require(arbitrations[projectId].status != Types.Status.Resolved);
        emit Evidence(IArbitrator(arbitratorAddress), projectId, msg.sender, _evidence);
    }

    /**
     * @notice project or investors appeal.
     * @dev Throws if the status is not Appealable.
     * @param projectId The id of the project arbitration for which to query the delta.
     */
    function appeal(uint256 projectId) external payable {
        Types.Arbitration storage arbitration = arbitrations[projectId];

        /* verify msg.value is same as appealCost*/
        require(msg.value == IArbitrator(arbitratorAddress).appealCost(arbitration.disputeID, ""),"53");

        IArbitrator.DisputeStatus status = IArbitrator(arbitratorAddress).disputeStatus(arbitration.disputeID);
        require(status == IArbitrator.DisputeStatus.Appealable,"54");

        IArbitrator(arbitratorAddress).appeal.value(msg.value)(arbitration.disputeID, "");
    }
}