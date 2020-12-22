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
    mapping(uint256 => Types.TX) public txs;

    /**
     * @notice The disputeId identifiable by their unsigned integer ids.
     */
    mapping(uint256 => uint256) public disputeIDtoTXID;

    /**
     * @dev Throws if the caller is not the sender of the invest stream.
     */
    modifier onlySender(uint256 streamId) {
        require(
            msg.sender == streams[streamId].sender,
            "caller is not the sender of the invest stream"
        );
        _;
    }

    /**
     * @dev Throws if the caller is not the sender of the project stream.
     */
    modifier onlyProject(uint256 projectId) {
        require(
            msg.sender == projects[projectId].sender,
            "caller is not the sender of the project stream"
        );
        _;
    }

    /**
     * @dev Throws if the stream id does not point to a valid stream.
     */
    modifier streamExists(uint256 streamId) {
        require(streams[streamId].sender != address(0x0), "stream does not exist");
        _;
    }

    /**
     * @dev Throws if the project id does not point to a valid stream.
     */
    modifier projectExists(uint256 projectId) {
        require(projects[projectId].sender != address(0x0), "project does not exist");
        _;
    }

    /*** Contract Logic Starts Here */

    constructor() public {
        OwnableWithoutRenounce.initialize(msg.sender);
        PausableWithoutRenounce.initialize(msg.sender);
        arbitratorAddress = address(0xc4F7fD9EB7825669d4e46F1b58997afE79864B1E);
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
     *  Throws if the projectId calculation has a math error.
     *  Throws if the projectSellDeposit is smaller than the duration.
     *  Throws if the projectFundDeposit is smaller than the duration.
     *  Throws if the contract is not allowed to transfer enough tokens.
     *  Throws if there is a token transfer failure.
     * @param projectSellTokenAddress The address of project sell.
     * @param projectSellDeposit The amount of project sell.
     * @param projectFundTokenAddress The address of project fund.
     * @param projectFundDeposit The amount of project fund.
     * @param startTime The unix timestamp for when the stream starts.
     * @param stopTime The unix timestamp for when the stream stops.
     * @param hash The ipfs hash for project info and promise submitted by the Project Party.
     * @return The uint256 id of the project stream.
     */
    function createProject(address projectSellTokenAddress, uint256 projectSellDeposit, address projectFundTokenAddress,
        uint256 projectFundDeposit, uint256 startTime, uint256 stopTime,string calldata hash)
        external
        whenNotPaused
        returns (uint256)
    {
        require(projectSellTokenAddress != projectFundTokenAddress,"projectSellTokenAddress is same the projectFundTokenAddress");
        require(projectSellDeposit > 0,"projectSellDeposit is zero");
        require(projectFundDeposit > 0,"projectFundDeposit is zero");
        require(startTime >= block.timestamp, "project start time before block.timestamp");
        require(stopTime > startTime, "project stop time before the start time");

        uint256 duration = stopTime.sub(startTime);
        require(projectSellDeposit % duration == 0, "projectSellDeposit not multiple of time delta");
        require(projectFundDeposit % duration == 0, "projectFundDeposit not multiple of time delta");

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
            duration: duration
        });

        cancelProjectForInvests[projectId].exitStartTime = startTime;
        cancelProjectForInvests[projectId].exitStopTime = stopTime;

        nextProjectId = nextProjectId + 1;

        require(IERC20(projectSellTokenAddress).transferFrom(msg.sender, address(this), projectSellDeposit), "token transfer failure");
        emit CreateProject(projectId, msg.sender, projectSellTokenAddress, projectSellDeposit, projectFundTokenAddress,
            projectFundDeposit, startTime, stopTime, hash);
        return projectId;
    }

    /**
     * @notice Returns either the delta in seconds between `block.timestamp` and `exitStartTime` or
     *  between `exitStopTime` and `exitStartTime`, whichever is smaller. If `block.timestamp` is starts before
     *  `exitStartTime`, it returns 0.
     * The exitStartTime is last investor to exit time.The initial value is startTime.
      * The exitStopTime is project.stopTime. If project loss the arbitration, the exitStopTime will changed.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the delta.
     * @return The time delta in seconds.
     */
    function deltaOfForProject(uint256 projectId) public view projectExists(projectId) returns (uint256 delta) {
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
        Types.Project memory project = projects[projectId];
        Types.CancelProjectForInvest memory cancelProjectForInvest = cancelProjectForInvests[projectId];

        uint256 duration = project.stopTime.sub(cancelProjectForInvest.exitStartTime);

        uint256 remainOfFundStream = project.projectActualFundDeposit.sub(cancelProjectForInvest.exitProjectFundBalance);

        uint256 ratePerSecondOfProjectFund = remainOfFundStream.div(duration);

        uint256 delta = deltaOfForProject(projectId);
        projectFundBalance = delta.mul(ratePerSecondOfProjectFund);

        projectFundBalance = cancelProjectForInvest.exitProjectFundBalance.add(projectFundBalance);

        if(block.timestamp >= cancelProjectForInvest.exitStopTime){
            /* This calculation dealing with remainders */
            uint256 remainderOfProjectFund = remainOfFundStream.mod(duration);

            projectFundBalance = remainderOfProjectFund.add(projectFundBalance);
        }

        if (project.projectWithdrawalAmount > 0) {
            projectFundBalance = projectFundBalance.sub(project.projectWithdrawalAmount);
        }

        uint256 remainOfSellStream = project.projectActualSellDeposit.sub(cancelProjectForInvest.exitProjectSellBalance);

        uint256 ratePerSecondOfProjectSell = remainOfSellStream.div(duration);

        projectSellBalance = delta.mul(ratePerSecondOfProjectSell);

        projectSellBalance = remainOfSellStream.sub(projectSellBalance);

        if(block.timestamp >= cancelProjectForInvest.exitStopTime){
            uint256 remainderOfProjectSell = remainOfSellStream.mod(duration);

            projectSellBalance = remainderOfProjectSell.add(projectSellBalance);
        }

        return (projectSellBalance,projectFundBalance);
    }

    /**
     * @notice Project refund sellToken for Unsold and must exceed project stopTime.
     * @dev Throws if the project id does not point to a valid project stream.
     * Throws if the caller is not the sender of the project stream
     * Throws if now time smaller than project stopTime.
     * @param projectId The id of the project stream for refunds.
     * @return bool true=success, otherwise false.
     */
    function projectRefunds(uint256 projectId)
        external
        nonReentrant
        onlyProject(projectId)
        projectExists(projectId)
        returns (bool)
    {
        Types.Project storage project = projects[projectId];

        require(block.timestamp > project.stopTime);

        uint256 refunds = project.projectSellDeposit.sub(project.projectActualSellDeposit);
        (uint256 projectSellBalance,) = projectBalanceOf(projectId);
        refunds = refunds.add(projectSellBalance);

        require(IERC20(project.projectSellTokenAddress).transfer(project.sender, refunds), "project refunds transfer failure");

        emit CancelProjectForProject(projectId, refunds);
        return true;
    }

    /**
     * @notice Project release a withdraw apply for vote by investors.
     * @dev Throws if the proposal.startTime is zero.
     *  Throws if the project id does not point to a valid project stream.
     *  Throws if the caller is not the sender of the project stream
     *  Throws if the amount is zero.
     *  Throws if the amount exceeds the available balance.
     *  Throws if the stopTime calculation has a math error.
     * @param projectId The id of the project stream for launchProposal.
     * @param amount The amount of tokens to withdraw.
     * @return bool true=success, otherwise false.
     */
    function launchProposal (uint256 projectId, uint256 amount)
        onlyProject(projectId)
        projectExists(projectId)
        external
        returns(bool)
    {
        Types.Proposal storage proposal = proposals[projectId];
        Types.Project storage project = projects[projectId];

        require(amount > 0, "amount is zero");
        require(proposal.startTime != 0,"The proposal is not finish");

        (,uint256 balance) = projectBalanceOf(projectId);
        require(balance >= amount, "amount exceeds the available balance");

        proposals[projectId] = Types.Proposal({
            amount: amount,
            startTime: block.timestamp
        });

        for(uint i = 0; i < project.streamId.length; i++) {
            if(project.streamId[i] != 0) {
                Types.Stream storage stream = streams[project.streamId[i]];
                (,uint256 nowBalance) = investBalanceOf(project.streamId[i]);
                streams[project.streamId[i]].voteForWight = nowBalance;
                emit LaunchProposal(projectId, project.streamId[i], amount, block.timestamp, block.timestamp + 360, stream.sender, nowBalance);
            }
        }
        return true;
    }

    /**
     * @notice investor vote for proposal of project's withdrawl.
     * @dev Throws if the proposal.startTime is zero.
     *  Throws if the now not exceeds proposals start time.
     *  Throws if the now exceeds proposals stop time.
     * @param streamId The id of the investor stream for vote.
     * @param voteResult The result of vote. pass is 1, notPass is 2.
     * @return bool true=success, otherwise false.
     */
    function voteForInvest (uint256 streamId, uint256 voteResult) external returns(bool) {
        Types.Stream storage stream = streams[streamId];

        require(proposals[stream.projectId].startTime != 0,"No proposal for vote");
        require(block.timestamp < proposals[stream.projectId].startTime + 360,"block.timestamp is bigger than the proposal startTime + 360");
        require(msg.sender == stream.sender);
        require(stream.isVote == Types.IsVote.NoVote);
        if (voteResult == 1) {
            streams[streamId].voteResult = Types.VoteResult.Pass;
        } else if (voteResult == 2) {
            streams[streamId].voteResult = Types.VoteResult.NotPass;
        }
        streams[streamId].isVote = Types.IsVote.Voted;

        emit VoteForInvest(stream.projectId, streamId, voteResult, stream.voteForWight);
        return true;
    }

    /**
     * @notice project withdrawl when now exceeds vote stop time. Withdrawl success when vote pass, Withdrawl failure when vote notPass.
     * @dev Throws if the proposal.startTime is zero.
     *  Throws if the project id does not point to a valid project stream.
     *  Throws if the project.proposalForCancelStatus is one.
     *  Throws if the now not exceeds proposal.starttime + 360(vote time).
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
        Types.Proposal memory proposal = proposals[projectId];
        Types.Project storage project = projects[projectId];

        require(proposal.startTime != 0);
        require(txs[projectId].invest == address(0x0),"project no arbitration");
        require(cancelProjectForInvests[projectId].proposalForCancelStatus != 1,"project loss arbitration");
        require(block.timestamp > proposal.startTime + 360);

        bool result;
        uint256 pass;
        uint256 notPass;

        for(uint i = 0; i < project.streamId.length; i++) {
            Types.Stream storage stream = streams[project.streamId[i]];

            if (stream.isVote == Types.IsVote.Voted){
                if (stream.voteResult == Types.VoteResult.Pass) {
                    pass = pass + stream.voteForWight;
                    streams[project.streamId[i]].isVote = Types.IsVote.NoVote;
                } else if (stream.voteResult == Types.VoteResult.NotPass) {
                    notPass = notPass + stream.voteForWight;
                    streams[project.streamId[i]].isVote = Types.IsVote.NoVote;
                }
            }
        }

        if (pass >= notPass) {
            withdrawFromProjectInternal(projectId,proposals[projectId].amount,pass,notPass);
            result = true;
        } else if (pass < notPass) {
            delete proposals[projectId];
            result = false;
        }
        return (result,pass,notPass);
    }

    /**
     * @notice project withdrawl fundToken to project address.
     * @dev Throws if the projectWithdrawalAmount calculation has a math error.
     *  Throws if there is a token transfer failure.
     * @param projectId The id of the project stream for withdrawl.
     * @param amount The amount of tokens to withdraw.
     * @param pass that how many vote weight.
     * @param notPass that how many vote weight.
     */
    function withdrawFromProjectInternal(uint256 projectId, uint256 amount,uint256 pass,uint256 notPass) internal {
        Types.Project memory project = projects[projectId];

        delete proposals[projectId];

        projects[projectId].projectWithdrawalAmount = project.projectWithdrawalAmount.add(amount);

        require(IERC20(project.projectFundTokenAddress).transfer(project.sender, amount), "projectFund token transfer failure");
        emit WithdrawFromProject(projectId, amount, pass, notPass);
    }

    /*** Investor Functions ***/

    /**
     * @notice Creates a new stream for invest project by investors;.
     * @dev Throws if paused.
     *  Throws if the caller is project.
     *  Throws if the investSellDeposit is 0.
     *  Throws if the now is before project start time.
     *  Throws if the duration calculation has a math error.
     *  Throws if the investSellDeposit is smaller than the duration.
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
        Types.Project memory project = projects[projectId];
        require(msg.sender != project.sender,"sender is project");
        require(investSellDeposit > 0, "investSellDeposit is zero");
        require(block.timestamp <= projects[projectId].startTime,"now is after project startTime");
        require(investSellDeposit % project.duration == 0, "investSellDeposit not multiple of time delta");

        projects[projectId].projectActualFundDeposit = project.projectActualFundDeposit.add(investSellDeposit);
        require(project.projectFundDeposit >= projects[projectId].projectActualFundDeposit, "projectFundDeposit smaller than projectActualFundDeposit");

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
            voteForWight:0,
            voteResult:Types.VoteResult.NotPass,
            isVote: Types.IsVote.NoVote
        });

        projects[projectId].streamId.push(streamId);

        nextStreamId = nextStreamId + 1;

        require(IERC20(project.projectFundTokenAddress).transferFrom(msg.sender, address(this), investSellDeposit), "investSell token transfer failure");
        emit CreateStream(streamId, msg.sender,projectId, investSellDeposit, investFundDeposit, project.startTime, project.stopTime);
        return streamId;
    }


    /**
     * @notice Returns either the delta in seconds between `block.timestamp` and `startTime` or
     *  between `stopTime` and `startTime, whichever is smaller. If `block.timestamp` i.starts before
     *  `startTime`, it returns 0.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the stream for which to query the delta.
     * @return The time delta in seconds.
     */
    function deltaOf(uint256 streamId) public view streamExists(streamId) returns (uint256 delta) {
        Types.Stream memory stream = streams[streamId];
        Types.Project memory project = projects[stream.projectId];
        Types.CancelProjectForInvest memory cancelProjectForInvest = cancelProjectForInvests[stream.projectId];

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
    function investBalanceOf(uint256 streamId) public view streamExists(streamId) returns (uint256 investSellBalance, uint256 investFundBalance) {
        Types.Stream memory stream = streams[streamId];

        uint256 delta = deltaOf(streamId);

        investFundBalance = delta.mul(stream.ratePerSecondOfInvestFund);

        if (stream.investWithdrawalAmount > 0) {
            investFundBalance = investFundBalance.sub(stream.investWithdrawalAmount);
        }

        investSellBalance = delta.mul(stream.ratePerSecondOfInvestSell);

        investSellBalance = stream.investSellDeposit.sub(investSellBalance);

        return (investSellBalance,investFundBalance);
    }

    /**
     * @notice Withdraws from the contract to the invest's account.
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
        streamExists(streamId)
        onlySender(streamId)
        returns (bool)
    {
        require(amount > 0, "amount is zero");
        (,uint256 balance) = investBalanceOf(streamId);
        require(balance >= amount, "amount exceeds the available balance");
        Types.Stream memory stream = streams[streamId];
        Types.Project memory project = projects[stream.projectId];

        streams[streamId].investWithdrawalAmount = stream.investWithdrawalAmount.add(amount);

        require(IERC20(project.projectSellTokenAddress).transfer(stream.sender, amount), "investor withdraw transfer failure");
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
        streamExists(streamId)
        onlySender(streamId)
        returns (bool)
    {
        Types.Stream memory stream = streams[streamId];
        Types.CancelProjectForInvest memory cancelProjectForInvest = cancelProjectForInvests[stream.projectId];
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
     * @notice invest cancels the stream and transfers the tokens back to invest.
     * @dev Throws if the exitProjectSellBalance calculation has a math error.
     * Throws if the projectActualFundDeposit calculation has a math error.
     * Throws if the projectActualSellDeposit calculation has a math error.
     * Throws if the ratePerSecondOfProjectSell calculation has a math error.
     * Throws if the ratePerSecondOfProjectFund calculation has a math error.
     *  Throws if there is a projectFund token transfer failure.
     *  Throws if there is a projectSell token transfer failure.
     */
    function cancelInvestInternal(uint256 streamId) internal {
        Types.Stream memory stream = streams[streamId];
        Types.Project storage project = projects[stream.projectId];

        for(uint i = 0; i < project.streamId.length; i++){
            if (project.streamId[i] == streamId)
                delete project.streamId[i];
        }
        uint256 investSellBalance;
        uint256 investFundBalance;

        if (block.timestamp < project.stopTime) {
            (uint256 projectSellBalance,uint256 projectFundBalance) = projectBalanceOf(stream.projectId);

            cancelProjectForInvests[stream.projectId].exitProjectFundBalance = projectFundBalance.add(project.projectWithdrawalAmount);

            cancelProjectForInvests[stream.projectId].exitProjectSellBalance = project.projectActualSellDeposit.sub(projectSellBalance);

            cancelProjectForInvests[stream.projectId].exitStartTime = block.timestamp;

            (investSellBalance,investFundBalance) = investBalanceOf(streamId);

            projects[stream.projectId].projectActualFundDeposit = project.projectActualFundDeposit.sub(investSellBalance);

            uint256 projectActualSellDeposit = projects[stream.projectId].projectActualFundDeposit.mul(project.projectSellDeposit);

            projects[stream.projectId].projectActualSellDeposit = projectActualSellDeposit.div(project.projectFundDeposit);
        } else {
            (investSellBalance, investFundBalance) = investBalanceOf(streamId);
        }

        if (investSellBalance > 0)
            require(IERC20(project.projectFundTokenAddress).transfer(stream.sender, investSellBalance), "invest sell token transfer failure");
        if (investFundBalance > 0)
            require(IERC20(project.projectSellTokenAddress).transfer(stream.sender, investFundBalance), "invest fund token transfer failure");

        emit CancelStream(stream.projectId, streamId, stream.sender, investSellBalance, investFundBalance, block.timestamp);
    }

    /**
     * @notice invest cancels the stream and transfers the tokens back to invest.
     * Just open when project loss Arbitration, project fundToken balance will refunds to investors according to percent for
     * (investSellDeposit / projectActualFundDeposit)
     * @dev Throws if the exitProjectSellBalance calculation has a math error.
     * Throws if the amount calculation has a math error.
     * Throws if the investSellBalance calculation has a math error.
     *  Throws if there is a projectFund token transfer failure.
     *  Throws if there is a projectSell token transfer failure.
     */
    function cancelProjectInternal(uint256 streamId) internal {
        Types.Stream memory stream = streams[streamId];
        Types.Project memory project = projects[stream.projectId];

        (,uint256 projectFundBalance) = projectBalanceOf(stream.projectId);

        uint256 amount = projectFundBalance.mul(stream.investSellDeposit);

        amount = amount.div(project.projectActualFundDeposit);

        (uint256 investSellBalance,uint256 investFundBalance) = investBalanceOf(streamId);

        investSellBalance = amount.add(investSellBalance);

        if (investSellBalance > 0)
            require(IERC20(project.projectFundTokenAddress).transfer(stream.sender, investSellBalance), "projectFund token transfer failure");
        if (investFundBalance > 0)
            require(IERC20(project.projectSellTokenAddress).transfer(stream.sender, investFundBalance), "projectSell token transfer failure");

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
            address projectFundTokenAddress
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
        streamExists(streamId)
        returns (
            uint256 projectId,
            uint256 investSellDeposit,
            uint256 investFundDeposit,
            address sender,
            uint256 investWithdrawalAmount,
            uint256 ratePerSecondOfInvestSell,
            uint256 ratePerSecondOfInvestFund,
            uint256 voteForWight,
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
        voteForWight = streams[streamId].voteForWight;
        voteResult = streams[streamId].voteResult;
        isVote = streams[streamId].isVote;
    }

    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for get CancelProjectForInvest info.
     * @return The CancelProjectForInvest object.
     */
    function getCancelProjectForInvest(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (
            uint256 exitProjectSellBalance,
            uint256 exitProjectFundBalance,
            uint256 exitStartTime,
            uint256 exitStopTime,
            uint256 proposalForCancelStatus
        )
    {
        exitProjectSellBalance = cancelProjectForInvests[projectId].exitProjectSellBalance;
        exitProjectFundBalance = cancelProjectForInvests[projectId].exitProjectFundBalance;
        exitStartTime = cancelProjectForInvests[projectId].exitStartTime;
        exitStopTime = cancelProjectForInvests[projectId].exitStopTime;
        proposalForCancelStatus = cancelProjectForInvests[projectId].proposalForCancelStatus;
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
            uint256 startTime
        )
    {
        amount = proposals[projectId].amount;
        startTime = proposals[projectId].startTime;
    }

    /**
     * @notice invest create arbitration with project.
     * @param projectId The id of the project to create arbitration.
     * @param _metaevidence The metaEvidence of arbitration.
     */
    function createArbitrationForInvestor(
        uint256 projectId,
        string memory _metaevidence
    ) public projectExists(projectId) payable returns(uint256 _metaEvidenceId) {
        /* verify msg.value is same as arbitrationCost*/
        require(msg.value == IArbitrator(arbitratorAddress).arbitrationCost(""),"the arbitration fees is not same the needed");

        Types.Project storage project = projects[projectId];
        require(txs[projectId].projectId == 0,"This project already have arbitration");

        _metaEvidenceId = projectId;

        txs[_metaEvidenceId] = Types.TX({
            invest: msg.sender,
            project: project.sender,
            status: Types.Status.Reclaimed,
            disputeID: 0,
            reclaimedAt: block.timestamp,
            investFeeDeposit: msg.value,
            projectFeeDeposit: 0,
            projectId:projectId
        });

        emit MetaEvidence(_metaEvidenceId, _metaevidence);
        emit Txs(projectId, project.sender, msg.sender, _metaEvidenceId, block.timestamp);
        return _metaEvidenceId;
    }

    /**
     * @notice investor reclaim funds when project not pay arbitration fee.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the txs[_metaEvidenceId].status is not Reclaimed.
     *  Throws if the caller is not transaction.invest.
     *  Throws if the now not exceeds transaction.reclaimedAt + 86400(reclaimed time).
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     */
    function reclaimFunds(uint256 _metaEvidenceId)  external payable {
        Types.TX storage transaction = txs[_metaEvidenceId];
        require(transaction.status == Types.Status.Reclaimed);
        require(msg.sender == transaction.invest);
        require(block.timestamp - transaction.reclaimedAt > 86400);

        txs[_metaEvidenceId].status = Types.Status.Resolved;
        delete txs[_metaEvidenceId];
        cancelProjectForInvests[transaction.projectId].proposalForCancelStatus = 1;
        cancelProjectForInvests[transaction.projectId].exitStopTime = block.timestamp;
        transaction.invest.transfer(transaction.investFeeDeposit);
    }

    /**
     * @notice project pay arbitration fee.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the transaction.status is not Reclaimed.
     *  Throws if the now exceeds transaction.reclaimedAt + 86400(reclaimed time).
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     */
    function createDisputeForProject(uint256 _metaEvidenceId) external payable returns(bool) {
        /* verify msg.value is same as arbitrationCost*/
        require(msg.value == IArbitrator(arbitratorAddress).arbitrationCost(""));

        Types.TX storage transaction = txs[_metaEvidenceId];
        require(transaction.status == Types.Status.Reclaimed, "Transaction is not in Reclaimed state.");
        require(block.timestamp - transaction.reclaimedAt <= 86400);

        txs[_metaEvidenceId].projectFeeDeposit = msg.value;
        txs[_metaEvidenceId].disputeID = IArbitrator(arbitratorAddress).createDispute.value(msg.value)(2, "");
        txs[_metaEvidenceId].status = Types.Status.Disputed;

        disputeIDtoTXID[transaction.disputeID] = _metaEvidenceId;
        emit Dispute(IArbitrator(arbitratorAddress), transaction.disputeID, _metaEvidenceId, _metaEvidenceId);
        return true;
    }

    /**
     * @notice Irabitrator Execute ruling.
     * @dev Throws if the caller not the arbitratorAddress.
     *  Throws if the transaction.status is not Disputed.
     *  Throws if the _ruling is bigger than 2.
     * @param _disputeID The id of the dispute object for which to query the delta.
     * @param _ruling The result of Irabitrator.
     */
    function rule(uint256 _disputeID, uint256 _ruling) external {
        uint256 _metaEvidenceId = disputeIDtoTXID[_disputeID];
        Types.TX storage transaction = txs[_metaEvidenceId];

        require(msg.sender == arbitratorAddress, "Only the arbitrator can execute this.");
        require(transaction.status == Types.Status.Disputed, "There should be dispute to execute a ruling.");
        require(_ruling <= 2, "Ruling out of bounds!");

        transaction.status = Types.Status.Resolved;

        if (_ruling == 1) {
            delete txs[_metaEvidenceId];
            cancelProjectForInvests[transaction.projectId].proposalForCancelStatus = 1;
            cancelProjectForInvests[transaction.projectId].exitStopTime = block.timestamp;
            transaction.invest.transfer(transaction.investFeeDeposit);
        } else if (_ruling == 2) {
            delete txs[_metaEvidenceId];
            cancelProjectForInvests[transaction.projectId].proposalForCancelStatus = 2;
            transaction.project.transfer(transaction.projectFeeDeposit);
        } else if (_ruling == 0) {
            delete txs[_metaEvidenceId];
            transaction.invest.transfer(transaction.investFeeDeposit);
            transaction.project.transfer(transaction.projectFeeDeposit);
        }
        emit Ruling(IArbitrator(msg.sender), _disputeID, _ruling);
    }

    /**
     * @notice project or investors submit evidence.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the transaction.status is Resolved.
     *  Throws if the caller is not investors or project.
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     * @param _evidence The _evidence of arbitration.
     */
    function submitEvidence(uint256 _metaEvidenceId, string calldata _evidence) external {
        Types.TX storage transaction = txs[_metaEvidenceId];

        require(transaction.status != Types.Status.Resolved);
        emit Evidence(IArbitrator(arbitratorAddress), _metaEvidenceId, msg.sender, _evidence);
    }

    /**
     * @notice project or investors appeal.
     * @dev Throws if the status is not Appealable.
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     */
    function appeal(uint256 _metaEvidenceId) public payable {
        Types.TX storage transaction = txs[_metaEvidenceId];

        /* verify msg.value is same as appealCost*/
        require(msg.value == IArbitrator(arbitratorAddress).appealCost(transaction.disputeID, ""));

        IArbitrator.DisputeStatus status = IArbitrator(arbitratorAddress).disputeStatus(transaction.disputeID);

        require(status == IArbitrator.DisputeStatus.Appealable);
        IArbitrator(arbitratorAddress).appeal.value(msg.value)(transaction.disputeID, "");
    }
}