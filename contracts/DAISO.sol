pragma solidity 0.5.16;

import "../node_modules/@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";

import "./tools-contracts/OwnableWithoutRenounce.sol";
import "./tools-contracts/Exponential.sol";
import "./tools-contracts/PausableWithoutRenounce.sol";

import './Types.sol';

import "./interface/DAISOInterface.sol";
import "./interface/IArbitrator.sol";
import "./interface/IArbitrable.sol";
import "./interface/erc-1497/IEvidence.sol";

/**
 * @title DAISO: StreamPay + Kleros + DAICO
 * @author StreamPay
 */

contract DAISO is  OwnableWithoutRenounce, PausableWithoutRenounce, Exponential, ReentrancyGuard, DAISOInterface{
    /*** Storage Properties ***/

    /**
     * @notice in order to distinguish project stream and invest stream through symbol.
     */
    uint256 public streamSymbol;

    /**
    * @notice in order to distinguish project stream and invest stream through symbol.
    */
    uint256 public projectSymbol;

    /**
     * @notice Counter for invest stream ids.
     */
    uint256 public nextStreamId;

    /**
     * @notice Counter for project stream ids.
     */
    uint256 public nextProjectId;

    /**
     * @notice Address for Kleros Court.
     */
    address IArbitrableAddress;

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
     * @notice The invest stream for vote.
     * uint[i][0]:StreamId
     * uint[i][1]:Vote Weight
     * uint[i][2]:Vote Result, default 0, pass 1, notPass 2.
     * uint[i][3]:Vote or notVote, notVote 0, Vote 1.
     */
    mapping(uint256 => uint[4][]) public voters;  /* streamId,weight,voteResult:default 0, pass 1, notpass 2,voted: no 0, yes 1.*/

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
        require(streams[streamId].isEntity, "stream does not exist");
        _;
    }

    /**
     * @dev Throws if the project id does not point to a valid stream.
     */
    modifier projectExists(uint256 projectId) {
        require(projects[projectId].isEntity, "project does not exist");
        _;
    }

    /*** Contract Logic Starts Here */

    constructor() public {
        OwnableWithoutRenounce.initialize(msg.sender);
        PausableWithoutRenounce.initialize(msg.sender);
        nextStreamId = 1;
        nextProjectId = 1;
        projectSymbol = 1000000;
        streamSymbol = 2000000;
    }

    /*** Project Functions ***/

    struct CreateProjectLocalVars {
        MathError mathErr;
        uint256 duration;
    }

    /**
     * @notice Creates a new project stream for sell xDAI to fund DAI.
     * @dev Throws if paused.
     *  Throws if the projectSellTokenAddress is same the projectFundTokenAddress.
     *  Throws if the projectSellDeposit is 0.
     *  Throws if the projectFundDeposit is 0.
     *  Throws if the start time is before `block.timestamp`.
     *  Throws if the stop time is before the start time.
     *  Throws if the projectId calculation has a math error.
     *  Throws if the nextProjectId calculation has a math error.
     *  Throws if the projectSellDeposit is smaller than the duration.
     *  Throws if the projectFundDeposit is smaller than the duration.
     *  Throws if the next stream id calculation has a math error.
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
        uint256 projectFundDeposit, uint256 startTime, uint256 stopTime,string memory hash)
        public
        whenNotPaused
        returns (uint256)
    {
        require(projectSellTokenAddress != projectFundTokenAddress,"projectSellTokenAddress is same the projectFundTokenAddress");
        require(projectSellDeposit > 0,"projectSellDeposit is zero");
        require(projectFundDeposit > 0,"projectFundDeposit is zero");
        require(startTime >= block.timestamp, "project start time before block.timestamp");
        require(stopTime > startTime, "project stop time before the start time");

        CreateProjectLocalVars memory vars;

        (vars.mathErr, vars.duration) = subUInt(stopTime, startTime);
        assert(vars.mathErr == MathError.NO_ERROR);

        require(projectSellDeposit >= vars.duration, "projectSellDeposit smaller than time delta");
        require(projectFundDeposit >= vars.duration, "projectFundDeposit smaller than time delta");
        require(projectSellDeposit % vars.duration == 0, "projectSellDeposit not multiple of time delta");
        require(projectFundDeposit % vars.duration == 0, "projectFundDeposit not multiple of time delta");

        uint256 projectId;
        (vars.mathErr,projectId) = addUInt(projectSymbol,nextProjectId);
        assert(vars.mathErr == MathError.NO_ERROR);

        uint[] memory streamId;
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
            streamId: streamId,
            duration: vars.duration,
            isEntity: true
        });

        cancelProjectForInvests[projectId].exitStartTime = startTime;

        (vars.mathErr, nextProjectId) = addUInt(nextProjectId, uint256(1));
        assert(vars.mathErr == MathError.NO_ERROR);

        require(IERC20(projectSellTokenAddress).transferFrom(msg.sender, address(this), projectSellDeposit), "token transfer failure");
        emit CreateProject(projectId, msg.sender, projectSellTokenAddress, projectSellDeposit, projectFundTokenAddress,
            projectFundDeposit, startTime, stopTime, hash);
        return projectId;
    }

    /**
     * @notice Returns either the delta in seconds between `block.timestamp` and `exitStartTime` or
     *  between `stopTime` and `exitStartTime`, whichever is smaller. If `block.timestamp` is starts before
     *  `exitStartTime`, it returns 0.
     * The exitStartTime is last investor to exit time.The initial value is startTime
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the delta.
     * @return The time delta in seconds.
     */
    function deltaOfForProject(uint256 projectId) public view projectExists(projectId) returns (uint256 delta) {
        Types.Project memory project = projects[projectId];
        Types.CancelProjectForInvest memory cancelProjectForInvest = cancelProjectForInvests[projectId];
        if (block.timestamp <= cancelProjectForInvest.exitStartTime) return 0;
        if (block.timestamp < project.stopTime) return block.timestamp - cancelProjectForInvest.exitStartTime;
        return project.stopTime - cancelProjectForInvest.exitStartTime;
    }

    struct ProjectBalanceOfLocalVars {
        MathError mathErr;
        uint256 projectSellBalance;
        uint256 projectFundBalance;
        uint256 remainderOfProjectSell;
        uint256 remainderOfProjectFund;
        uint256 duration;
        uint256 ratePerSecondOfProjectSell;
        uint256 ratePerSecondOfProjectFund;
        uint256 remainOfFundStream;
    }

    /**
     * @notice Returns the sellToken balance and fundToken balance for project.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the delta.
     * @return The stream balance for project SellToken.
     * @return The stream balance for project FundToken.
     */
    function projectBalanceOf(uint256 projectId) public view projectExists(projectId) returns (uint256 projectSellBalance, uint256 projectFundBalance) {
        Types.Project memory project = projects[projectId];
        Types.CancelProjectForInvest memory cancelProjectForInvest = cancelProjectForInvests[projectId];

        ProjectBalanceOfLocalVars memory vars;

        (vars.mathErr, vars.duration) = subUInt(project.stopTime, cancelProjectForInvest.exitStartTime);
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.remainOfFundStream) = subUInt(project.projectActualFundDeposit, cancelProjectForInvest.exitProjectFundBalance);
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.ratePerSecondOfProjectFund) = divUInt(vars.remainOfFundStream, vars.duration);
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.ratePerSecondOfProjectSell) = divUInt(cancelProjectForInvest.exitProjectSellBalance, vars.duration);
        assert(vars.mathErr == MathError.NO_ERROR);

        uint256 delta = deltaOfForProject(projectId);
        (vars.mathErr, vars.projectFundBalance) = mulUInt(delta, vars.ratePerSecondOfProjectFund);
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.projectFundBalance) = addUInt(cancelProjectForInvest.exitProjectFundBalance, vars.projectFundBalance);
        assert(vars.mathErr == MathError.NO_ERROR);

        if(block.timestamp >= project.stopTime){
            /* This calculation dealing with remainders */
            (vars.mathErr,vars.remainderOfProjectFund) = modUInt(vars.remainOfFundStream,vars.duration);
            assert(vars.mathErr == MathError.NO_ERROR);

            (vars.mathErr, vars.projectFundBalance) = addUInt(vars.remainderOfProjectFund, vars.projectFundBalance);
            require(vars.mathErr == MathError.NO_ERROR, "recipient balance calculation error");
        }

        if (project.projectWithdrawalAmount > 0) {
            (vars.mathErr, vars.projectFundBalance) = subUInt(vars.projectFundBalance, project.projectWithdrawalAmount);
            assert(vars.mathErr == MathError.NO_ERROR);
        }

        (vars.mathErr, vars.projectSellBalance) = mulUInt(delta, vars.ratePerSecondOfProjectSell);
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.projectSellBalance) = subUInt(cancelProjectForInvest.exitProjectSellBalance, vars.projectSellBalance);
        assert(vars.mathErr == MathError.NO_ERROR);

        if(block.timestamp >= project.stopTime){
            /* This calculation dealing with remainders */
            (vars.mathErr,vars.remainderOfProjectSell) = modUInt(cancelProjectForInvest.exitProjectSellBalance,vars.duration);
            assert(vars.mathErr == MathError.NO_ERROR);

            (vars.mathErr, vars.projectSellBalance) = addUInt(vars.remainderOfProjectSell, vars.projectSellBalance);
            require(vars.mathErr == MathError.NO_ERROR, "recipient balance calculation error");
        }

        return (vars.projectSellBalance,vars.projectFundBalance);
    }

    struct projectRefundsInternalOfLocalVars {
        MathError mathErr;
        uint256 refunds;
    }

    /**
     * @notice Project refund sellToken for Unsold and must exceed project stopTime.
     * @dev Throws if the project id does not point to a valid project stream.
     * Throws if the caller is not the sender of the project stream
     * Throws if now time smaller than project stopTime.
     * @param projectId The id of the project stream for which to query the delta.
     * @return bool true=success, otherwise false.
     */
    function projectRefunds(uint256 projectId)
        public
        nonReentrant
        onlyProject(projectId)
        projectExists(projectId)
        returns (bool)
    {
        Types.Project memory project = projects[projectId];

        require(block.timestamp > project.stopTime);
        projectRefundsInternal(projectId);
        return true;
    }

    /**
     * @notice Project refund sellToken.
     * @dev Throws if the refunds calculation has a math error.
     * Throws if the projectSellBalance calculation has a math error.
     * Throws if there is a token transfer failure.
     * @param projectId The id of the project stream for which to query the delta.
     */
    function projectRefundsInternal(uint256 projectId) internal {
        Types.Project memory project = projects[projectId];
        projectRefundsInternalOfLocalVars memory vars;

        (vars.mathErr, vars.refunds) = subUInt(project.projectSellDeposit, project.projectActualSellDeposit);
        assert(vars.mathErr == MathError.NO_ERROR);

        require(IERC20(project.projectSellTokenAddress).transfer(project.sender, vars.refunds), "projectSell token transfer failure");
        emit CancelProjectForProject(projectId,vars.refunds);
    }

    struct LaunchProposalOfLocalVars {
        MathError mathErr;
        uint256 stopTime;
    }

    /**
     * @notice Project release a withdrawl apply for vote by investors.
     * @dev Throws if the proposal.status is not zero.
     *  Throws if the project id does not point to a valid project stream.
     *  Throws if the caller is not the sender of the project stream
     *  Throws if the amount is zreo.
     *  Throws if the amount exceeds the available balance.
     *  Throws if the stopTime calculation has a math error.
     * @param projectId The id of the project stream for which to query the delta.
     * @param amount The amount of tokens to withdraw.
     * @return bool true=success, otherwise false.
     */
    function launchProposal (uint256 projectId, uint256 amount)
        onlyProject(projectId)
        projectExists(projectId)
        public
        returns(bool)
    {
        Types.Proposal memory proposal = proposals[projectId];
        Types.Project memory project = projects[projectId];
        LaunchProposalOfLocalVars memory vars;

        require(amount > 0, "amount is zero");
        require(proposal.status == 0);

        (,uint256 balance) = projectBalanceOf(projectId);
        require(balance >= amount, "amount exceeds the available balance");

        (vars.mathErr, vars.stopTime) = addUInt(block.timestamp,360);
        assert(vars.mathErr == MathError.NO_ERROR);

        proposals[projectId] = Types.Proposal({
            amount: amount,
            status: 1,
            startTime: block.timestamp,
            stopTime: vars.stopTime
        });

        for(uint i = 0; i < project.streamId.length; i++) {
            if(project.streamId[i] != 0) {
                Types.Stream memory stream = streams[project.streamId[i]];
                (,uint256 nowBalance) = investBalanceOf(project.streamId[i]);
                voters[projectId].push([project.streamId[i], nowBalance, 0, 0]);
                emit LaunchProposal(projectId, project.streamId[i], amount, block.timestamp, vars.stopTime, stream.sender, nowBalance);
            }
        }
        return true;
    }

    /**
     * @notice investor vote for proposal of project withdrawl.
     * @dev Throws if the proposal.status is not 1.
     *  Throws if the now not exceeds proposals start time.
     *  Throws if the now exceeds proposals stop time.
     * @param projectId The id of the project stream for which to query the delta.
     * @param voteResult The result of vote. pass is 1, notPass is 2.
     * @return bool true=success, otherwise false.
     */
    function voteForInvest (uint256 projectId, uint256 voteResult) public returns(bool) {
        require(proposals[projectId].status == 1,"1");
        require(block.timestamp > proposals[projectId].startTime,"2");
        require(block.timestamp < proposals[projectId].startTime + 360,"3");
        for(uint i = 0; i < voters[projectId].length; i++) {
            Types.Stream memory stream = streams[voters[projectId][i][0]];
            if (msg.sender == stream.sender) {
                if (voters[projectId][i][3] == 0) {
                    voters[projectId][i][2] = voteResult;
                    voters[projectId][i][3] = 1;
                    emit VoteForInvest(projectId,voters[projectId][i][0],voters[projectId][i][1],voters[projectId][i][2]);
                    return true;
                }
            }
        }
    }

    /**
     * @notice Return investors vote status.
     * @dev Throws if the proposal.status is not 1.
     *  Throws if the now not exceeds proposals start time.
     *  Throws if the now exceeds proposals stop time.
     * @param streamId The id of the stream for which to query the delta.
     * @return voteResult of vote result.
     * @return voted of vote or not vote.
     */
    function voteForInvestStatus (uint256 streamId) streamExists(streamId) public returns (uint256 voteResult,uint256 voted) {
        Types.Stream memory stream = streams[streamId];
        for(uint i = 0; i < voters[stream.projectId].length; i++) {
            if(streamId == voters[stream.projectId][i][0]) {
                voteResult =  voters[stream.projectId][i][2];
                voted =  voters[stream.projectId][i][3];
                return(voteResult, voted);
            }
        }
    }

    /**
     * @notice project withdrawl when now exceeds vote stop time.Withdrawl success when vote pass, Withdrawl failure when vote notPass.
     * @dev Throws if the proposal.status is not one.
     *  Throws if the project id does not point to a valid project stream.
     *  Throws if the project.proposalForCancelStatus is one.
     *  Throws if the now not exceeds proposal.starttime + 360(vote time).
     * @param projectId The id of the project stream for which to query the delta.
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

        require(proposal.status == 1);
        require(cancelProjectForInvests[projectId].proposalForCancelStatus != 1);

        require(block.timestamp > proposal.stopTime);

        bool result;
        uint256 pass;
        uint256 notPass;

        for(uint i = 0; i < voters[projectId].length; i++) {
            if (voters[projectId][i][2] == 1) {
                pass = pass + voters[projectId][i][1];
            } else if (voters[projectId][i][2] == 2){
                notPass = notPass + voters[projectId][i][1];
            }
        }
        if (pass >= notPass) {
            withdrawFromProjectInternal(projectId,proposals[projectId].amount,pass,notPass);
            result = true;
        } else if (pass < notPass) {
            delete proposals[projectId];
            delete voters[projectId];
            result = false;
        }
        return (result,pass,notPass);
    }

    struct WithdrawFromProjectInternalLocalVars {
        MathError mathErr;
    }

    /**
     * @notice project withdrawl fundToken to project address.
     * @dev Throws if the projectWithdrawalAmount calculation has a math error.
     *  Throws if there is a token transfer failure.
     * @param projectId The id of the project stream for which to query the delta.
     * @param amount The amount of tokens to withdraw.
     * @param pass that how many vote weight.
     * @param notPass that how many vote weight.
     */
    function withdrawFromProjectInternal(uint256 projectId, uint256 amount,uint256 pass,uint256 notPass) internal {
        Types.Project memory project = projects[projectId];
        WithdrawFromProjectInternalLocalVars memory vars;

        delete proposals[projectId];
        delete voters[projectId];

        (vars.mathErr, projects[projectId].projectWithdrawalAmount) = addUInt(project.projectWithdrawalAmount, amount);
        assert(vars.mathErr == MathError.NO_ERROR);

        require(IERC20(project.projectFundTokenAddress).transfer(project.sender, amount), "projectFund token transfer failure");
        emit WithdrawFromProject(projectId, amount, pass, notPass);
    }

    /*** Investor Functions ***/

    struct CreateStreamLocalVars {
        MathError mathErr;
        uint256 investFundDeposit;
        uint256 ratePerSecondOfInvestSell;
        uint256 ratePerSecondOfInvestFund;
        uint256 amount;
    }

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
     *  Throws if the next stream id calculation has a math error.
     *  Throws if the contract is not allowed to transfer enough tokens.
     *  Throws if there is a token transfer failure.
     *  Throws if the projectFundDeposit is smaller than projectActualFundDeposit.
     * @param projectId The id of the project stream for which to query the delta.
     * @param investSellDeposit The amount of money to be invested.
     * @return The uint256 id of the newly created invest stream.
     */
    function createStream(uint256 projectId, uint256 investSellDeposit)
        public
        whenNotPaused
        returns (uint256)
    {
        Types.Project memory project = projects[projectId];
        CreateStreamLocalVars memory vars;
        require(msg.sender != project.sender,"sender is project");
        require(investSellDeposit > 0, "investSellDeposit is zero");
        require(block.timestamp <= projects[projectId].startTime,"now is after project startTime");
        require(investSellDeposit >= project.duration, "investSellDeposit smaller than time delta");
        require(investSellDeposit % project.duration == 0, "investSellDeposit not multiple of time delta");

        (vars.mathErr, projects[projectId].projectActualFundDeposit) = addUInt(project.projectActualFundDeposit, investSellDeposit);
        assert(vars.mathErr == MathError.NO_ERROR);

        require(project.projectFundDeposit >= projects[projectId].projectActualFundDeposit, "projectFundDeposit smaller than projectActualFundDeposit");

        (vars.mathErr, projects[projectId].projectActualSellDeposit) = mulThenDivUint(projects[projectId].projectActualFundDeposit,project.projectSellDeposit,project.projectFundDeposit);
        assert(vars.mathErr == MathError.NO_ERROR);

        cancelProjectForInvests[projectId].exitProjectSellBalance = projects[projectId].projectActualSellDeposit;

        (vars.mathErr, vars.investFundDeposit) = mulThenDivUint(investSellDeposit,project.projectSellDeposit,project.projectFundDeposit);
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.ratePerSecondOfInvestSell) = divUInt(investSellDeposit, project.duration);
        /* `divUInt` can only return MathError.DIVISION_BY_ZERO but we know `duration` is not zero. */
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.ratePerSecondOfInvestFund) = divUInt(vars.investFundDeposit, project.duration);
        /* `divUInt` can only return MathError.DIVISION_BY_ZERO but we know `duration` is not zero. */
        assert(vars.mathErr == MathError.NO_ERROR);

        uint256 streamId;
        (vars.mathErr,streamId) = addUInt(streamSymbol,nextStreamId);
        assert(vars.mathErr == MathError.NO_ERROR);

        streams[streamId] = Types.Stream({
            projectId:projectId,
            investSellDeposit: investSellDeposit,
            investFundDeposit: vars.investFundDeposit,
            ratePerSecondOfInvestSell: vars.ratePerSecondOfInvestSell,
            ratePerSecondOfInvestFund: vars.ratePerSecondOfInvestFund,
            sender: msg.sender,
            investWithdrawalAmount:0,
            isEntity: true
        });

        projects[projectId].streamId.push(streamId);

        /* Increment the next stream id. */
        (vars.mathErr, nextStreamId) = addUInt(nextStreamId, uint256(1));
        assert(vars.mathErr == MathError.NO_ERROR);

        require(IERC20(project.projectFundTokenAddress).transferFrom(msg.sender, address(this), investSellDeposit), "investSell token transfer failure");
        emit CreateStream(streamId, msg.sender,projectId, investSellDeposit, vars.investFundDeposit, project.startTime, project.stopTime);
        return streamId;
    }

    struct InvestBalanceOfLocalVars {
        MathError mathErr;
        uint256 investFundBalance;
        uint256 investSellBalance;
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

        if (block.timestamp <= project.startTime) return 0;
        if (block.timestamp < project.stopTime) return block.timestamp - project.startTime;
        return project.stopTime - project.startTime;
    }

    /**
     * @notice Returns the sellToken balance and fundToken balance for invest.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the invest stream for which to query the delta.
     * @return The stream balance for invest SellToken.
     * @return The stream balance for invest FundToken.
    */
    function investBalanceOf(uint256 streamId) public view streamExists(streamId) returns (uint256 investSellBalance, uint256 investFundBalance) {
        Types.Stream memory stream = streams[streamId];
        InvestBalanceOfLocalVars memory vars;

        uint256 delta = deltaOf(streamId);
        (vars.mathErr, vars.investFundBalance) = mulUInt(delta, stream.ratePerSecondOfInvestFund);
        assert(vars.mathErr == MathError.NO_ERROR);

        if (stream.investWithdrawalAmount > 0) {
            (vars.mathErr, vars.investFundBalance) = subUInt(vars.investFundBalance, stream.investWithdrawalAmount);
            /* `withdrawalAmount` cannot and should not be bigger than `recipientBalance`. */
            assert(vars.mathErr == MathError.NO_ERROR);
        }

        (vars.mathErr, vars.investSellBalance) = mulUInt(delta, stream.ratePerSecondOfInvestSell);
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, vars.investSellBalance) = subUInt(stream.investSellDeposit, vars.investSellBalance);
        assert(vars.mathErr == MathError.NO_ERROR);

        return (vars.investSellBalance,vars.investFundBalance);
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

        withdrawFromInvestInternal(streamId, amount);
        return true;
    }

    struct WithdrawFromInvestInternalLocalVars {
        MathError mathErr;
    }

    /**
     * @notice Makes the withdrawal to the invest of the stream.
     * @dev Throws if the investWithdrawalAmount calculation has a math error.
     *  Throws if there is a token transfer failure.
     */
    function withdrawFromInvestInternal(uint256 streamId, uint256 amount) internal {
        Types.Stream memory stream = streams[streamId];
        Types.Project memory project = projects[stream.projectId];

        WithdrawFromInvestInternalLocalVars memory vars;
        (vars.mathErr, streams[streamId].investWithdrawalAmount) = addUInt(stream.investWithdrawalAmount, amount);
        assert(vars.mathErr == MathError.NO_ERROR);

        require(IERC20(project.projectSellTokenAddress).transfer(stream.sender, amount), "projectSell token transfer failure");
        emit WithdrawFromInvest(streamId, stream.projectId, stream.sender, amount);
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

    struct CancelInvestInternalOfLocalVars {
        MathError mathErr;
        uint256 amount;
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
        Types.Project memory project = projects[stream.projectId];
        CancelInvestInternalOfLocalVars memory vars;

        for(uint i = 0; i < project.streamId.length; i++){
            if (project.streamId[i] == streamId)
                delete project.streamId[i];
        }

        (uint256 projectSellBalance,uint256 projectFundBalance) = projectBalanceOf(stream.projectId);

        (vars.mathErr, cancelProjectForInvests[stream.projectId].exitProjectFundBalance) = addUInt(projectFundBalance, project.projectWithdrawalAmount);
        assert(vars.mathErr == MathError.NO_ERROR);

        cancelProjectForInvests[stream.projectId].exitProjectSellBalance = projectSellBalance;
        cancelProjectForInvests[stream.projectId].exitStartTime = block.timestamp;

        (uint256 investSellBalance,uint256 investFundBalance) = investBalanceOf(streamId);

        (vars.mathErr, projects[stream.projectId].projectActualFundDeposit) = subUInt(project.projectActualFundDeposit, investSellBalance);
        assert(vars.mathErr == MathError.NO_ERROR);

        (vars.mathErr, projects[stream.projectId].projectActualSellDeposit) = mulThenDivUint(projects[stream.projectId].projectActualFundDeposit,project.projectSellDeposit,project.projectFundDeposit);
        assert(vars.mathErr == MathError.NO_ERROR);

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
        CancelInvestInternalOfLocalVars memory vars;

        (,uint256 projectFundBalance) = projectBalanceOf(stream.projectId);

        (vars.mathErr, vars.amount) = mulThenDivUint(projectFundBalance,stream.investSellDeposit,project.projectActualFundDeposit);
        assert(vars.mathErr == MathError.NO_ERROR);

        (uint256 investSellBalance,uint256 investFundBalance) = investBalanceOf(streamId);

        (vars.mathErr, investSellBalance) = addUInt(vars.amount, investSellBalance);
        assert(vars.mathErr == MathError.NO_ERROR);

        if (investSellBalance > 0)
            require(IERC20(project.projectFundTokenAddress).transfer(stream.sender, investSellBalance), "projectFund token transfer failure");
        if (investFundBalance > 0)
            require(IERC20(project.projectSellTokenAddress).transfer(stream.sender, investFundBalance), "projectSell token transfer failure");

        emit CancelProject(stream.projectId, streamId, stream.sender, investSellBalance, investFundBalance,vars.amount,block.timestamp);
    }



    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the delta.
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
     * @param streamId The id of the invest stream for which to query the delta.
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
            uint256 ratePerSecondOfInvestFund
        )
    {
        projectId = streams[streamId].projectId;
        investSellDeposit = streams[streamId].investSellDeposit;
        investFundDeposit = streams[streamId].investFundDeposit;
        sender = streams[streamId].sender;
        investWithdrawalAmount = streams[streamId].investWithdrawalAmount;
        ratePerSecondOfInvestSell = streams[streamId].ratePerSecondOfInvestSell;
        ratePerSecondOfInvestFund = streams[streamId].ratePerSecondOfInvestFund;
    }

    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the delta.
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
            uint256 proposalForCancelStatus
        )
    {
        exitProjectSellBalance = cancelProjectForInvests[projectId].exitProjectSellBalance;
        exitProjectFundBalance = cancelProjectForInvests[projectId].exitProjectFundBalance;
        exitStartTime = cancelProjectForInvests[projectId].exitStartTime;
        proposalForCancelStatus = cancelProjectForInvests[projectId].proposalForCancelStatus;
    }

    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the delta.
     * @return The Proposal object.
     */
    function getProposal(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (
            uint256 amount,
            uint256 status,
            uint256 startTime,
            uint256 stopTime
        )
    {
        amount = proposals[projectId].amount;
        status = proposals[projectId].status;
        startTime = proposals[projectId].startTime;
        stopTime = proposals[projectId].stopTime;
    }


    /*** Arbitration Functions ***/

    /**
     * @notice Enforcement of the rulling for Arbitration.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the delta.
     * @param rulling The result of Arbitration.
     */
    function rullingResult(uint256 projectId, uint256 rulling) public {
        require(msg.sender == IArbitrableAddress,"ONLY IArbitrableAddress");
        emit RullingResult(projectId,rulling);
        if (rulling == 1) {
            cancelProjectForInvests[projectId].proposalForCancelStatus = 1;
            projects[projectId].stopTime = block.timestamp;
        } else if (rulling == 2) {
            cancelProjectForInvests[projectId].proposalForCancelStatus = 2;
        }
    }

    /**
     * @notice Update IArbitrator address.
     * @dev Throws if the caller is not the owner of the contract.
     * @param _IArbitrableAddress The address of the IArbitrator.
     */
    function updateAddress(address _IArbitrableAddress) public onlyOwner {
        IArbitrableAddress = _IArbitrableAddress;
    }

    function getTime() external view returns(uint){
        return block.timestamp;
    }
}


/**
 * @title DAISO's IArbitrable
 * @author StreamPay
 */
contract IArbitrables is IArbitrable, IEvidence,OwnableWithoutRenounce, PausableWithoutRenounce, Exponential{

    /**
     * @notice Counter for new stream ids.
     */
    uint256 public nextMetaEvidenceId;

    /**
     * @notice Address of IArbitrator.
     */
    address arbitratorAddress;

    /**
     * @notice Address of DAISO.
     */
    DAISO daiso;

    /**
     * @notice rulling options.
     */
    enum RulingOptions {RefusedToArbitrate, InvestWins, ProjectWins}

    /**
     * @notice The arbitration objects identifiable by their unsigned integer ids.
     */
    mapping(uint256 => Types.TX) public txs;

    /**
     * @notice The disputeId identifiable by their unsigned integer ids.
     */
    mapping(uint256 => uint256) public disputeIDtoTXID;

    /**
     * @dev Throws if the arbitration id does not point to a valid txs.
     */
    modifier _metaEvidenceIdExists(uint256 _metaEvidenceId) {
        require(txs[_metaEvidenceId].isEntity, "txs[_metaEvidenceId] does not exist");
        _;
    }

    constructor(DAISO _daiso) public {
        OwnableWithoutRenounce.initialize(msg.sender);
        PausableWithoutRenounce.initialize(msg.sender);
        arbitratorAddress = address(0x3E57E2d635bA68E68197aE8b9a1a8b88342587c9);
        daiso = _daiso;
        nextMetaEvidenceId = 1;
    }

    struct NewTransactionLocalVars {
        MathError mathErr;
    }

    /**
     * @notice invest create arbitration with project.
     * @dev Throws if the txs[_metaEvidenceId].status is Reclaimed or Disputed.
     * @param projectId The id of the project arbitration for which to query the delta.
     * @param project The address of project.
     * @param _metaevidence The metaEvidence of arbitration.
     */
    function newTransaction(
        uint256 projectId,
        address payable project,
        string memory _metaevidence
    ) public payable returns(uint256 _metaEvidenceId) {
        NewTransactionLocalVars memory vars;
        _metaEvidenceId = nextMetaEvidenceId;

        (vars.mathErr, nextMetaEvidenceId) = addUInt(nextMetaEvidenceId, uint256(1));
        require(vars.mathErr == MathError.NO_ERROR, "nextMetaEvidenceId id calculation error");

        txs[_metaEvidenceId] = Types.TX({
            invest: msg.sender,
            project: project,
            status: Types.Status.Reclaimed,
            disputeID: 10000000,
            reclaimedAt: block.timestamp,
            investFeeDeposit: msg.value,
            projectFeeDeposit: 0,
            projectId:projectId,
            isEntity: true
        });
        emit MetaEvidence(_metaEvidenceId, _metaevidence);
        emit Txs(projectId,project,msg.sender,_metaEvidenceId,block.timestamp);
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
    function reclaimFunds(uint256 _metaEvidenceId) _metaEvidenceIdExists(_metaEvidenceId) public payable {
        Types.TX storage transaction = txs[_metaEvidenceId];
        require(transaction.status == Types.Status.Reclaimed);
        require(msg.sender == transaction.invest);
        require(block.timestamp - transaction.reclaimedAt > 86400);

        txs[_metaEvidenceId].status = Types.Status.Resolved;
        daiso.rullingResult(transaction.projectId,1);
        transaction.invest.transfer(transaction.investFeeDeposit);
    }

    /**
     * @notice project pay arbitration fee.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the transaction.status is not Reclaimed.
     *  Throws if the now exceeds transaction.reclaimedAt + 86400(reclaimed time).
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     */
    function depositArbitrationFeeForPayee(uint256 _metaEvidenceId) _metaEvidenceIdExists(_metaEvidenceId) public payable {
        Types.TX storage transaction = txs[_metaEvidenceId];
        require(transaction.status == Types.Status.Reclaimed, "Transaction is not in Reclaimed state.");
        require(block.timestamp - transaction.reclaimedAt <= 86400);

        txs[_metaEvidenceId].projectFeeDeposit = msg.value;
        txs[_metaEvidenceId].disputeID = IArbitrator(arbitratorAddress).createDispute.value(msg.value)(2, "");
        txs[_metaEvidenceId].status = Types.Status.Disputed;

        disputeIDtoTXID[transaction.disputeID] = _metaEvidenceId;
        emit Dispute(IArbitrator(arbitratorAddress), transaction.disputeID, _metaEvidenceId, _metaEvidenceId);
    }

    /**
     * @notice project or investors submit evidence.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the transaction.status is Resolved.
     *  Throws if the caller is not investors or project.
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     * @param _evidence The _evidence of arbitration.
     */
    function submitEvidence(uint256 _metaEvidenceId, string memory _evidence) _metaEvidenceIdExists(_metaEvidenceId) public {
        Types.TX storage transaction = txs[_metaEvidenceId];

        require(transaction.status != Types.Status.Resolved);
        require(
            msg.sender == transaction.invest || msg.sender == transaction.project,
            "Third parties are not allowed to submit evidence."
        );
        emit Evidence(IArbitrator(arbitratorAddress), _metaEvidenceId, msg.sender, _evidence);
    }

    /**
     * @notice Irabitrator Execute ruling.
     * @dev Throws if the caller not the arbitratorAddress.
     *  Throws if the transaction.status is not Disputed.
     *  Throws if the _ruling is bigger than 2.
     * @param _disputeID The id of the dispute object for which to query the delta.
     * @param _ruling The result of Irabitrator.
     */
    function rule(uint256 _disputeID, uint256 _ruling) public  {
        uint256 _metaEvidenceId = disputeIDtoTXID[_disputeID];
        Types.TX storage transaction = txs[_metaEvidenceId];

        require(msg.sender == arbitratorAddress, "Only the arbitrator can execute this.");
        require(transaction.status == Types.Status.Disputed, "There should be dispute to execute a ruling.");
        require(_ruling <= 2, "Ruling out of bounds!");

        transaction.status = Types.Status.Resolved;

        if (_ruling == 1) {
            transaction.invest.transfer(transaction.investFeeDeposit);
        } else if (_ruling == 2) {
            transaction.project.transfer(transaction.projectFeeDeposit);
        }
        emit Rule(_metaEvidenceId, _disputeID, _ruling);
        daiso.rullingResult(transaction.projectId,_ruling);
    }

    /**
     * @notice Returns the Tx with all its properties.
     * @dev Throws if the _metaEvidenceId id does not point to a valid Tx.
     * @param _metaEvidenceId The id of the Tx for which to query the delta.
     * @return The Txs object.
     */
    function getTx(uint256 _metaEvidenceId)
        external
        view
        _metaEvidenceIdExists(_metaEvidenceId)
        returns (
            address invest,
            address project,
            Types.Status status,
            uint256 disputeID,
            uint256 reclaimedAt,
            uint256 investFeeDeposit,
            uint256 projectFeeDeposit,
            uint256 projectId
        )
    {
        invest = txs[_metaEvidenceId].invest;
        project = txs[_metaEvidenceId].project;
        status = txs[_metaEvidenceId].status;
        disputeID = txs[_metaEvidenceId].disputeID;
        reclaimedAt = txs[_metaEvidenceId].reclaimedAt;
        investFeeDeposit = txs[_metaEvidenceId].investFeeDeposit;
        projectFeeDeposit = txs[_metaEvidenceId].projectFeeDeposit;
        projectId = txs[_metaEvidenceId].projectId;
    }

    /**
     * @notice project or investors appeal.
     * @dev Throws if the status is not Appealable.
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     */
    function appeal(uint256 _metaEvidenceId,bytes memory _extraData) public payable {
        Types.TX storage transaction = txs[_metaEvidenceId];

        IArbitrator.DisputeStatus status = IArbitrator(arbitratorAddress).disputeStatus(transaction.disputeID);

        require(status == IArbitrator.DisputeStatus.Appealable);
        IArbitrator(arbitratorAddress).appeal.value(msg.value)(transaction.disputeID, "");
    }

    /**
     * @notice Enquiry arbitration cost.
     * @dev return arbitration cost.
     */
    function arbitrationCost(bytes memory _extraData) public returns (uint256) {
        return IArbitrator(arbitratorAddress).arbitrationCost("");
    }

    /**
     * @notice Enquiry appeal cost.
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     * @dev return appeal cost.
     */
    function appealCost(uint256 _metaEvidenceId,bytes memory _extraDataDisputeStatus) public returns (uint256) {
        Types.TX storage transaction = txs[_metaEvidenceId];

        return IArbitrator(arbitratorAddress).appealCost(transaction.disputeID, "");
    }

    /**
     * @notice Enquiry appeal period.
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     * @dev return appeal period.
     */
    function appealPeriod(uint256 _metaEvidenceId) public returns (uint256 start, uint256 end) {
        Types.TX storage transaction = txs[_metaEvidenceId];

        (start, end) =  IArbitrator(arbitratorAddress).appealPeriod(transaction.disputeID);
        return(start, end);
    }

    /**
     * @notice Enquiry dispute status.
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     * @dev return dispute status.
     */
    function disputeStatus(uint256 _metaEvidenceId) public returns (IArbitrator.DisputeStatus status) {
        Types.TX storage transaction = txs[_metaEvidenceId];

        status =  IArbitrator(arbitratorAddress).disputeStatus(transaction.disputeID);
        return status;
    }

    /**
     * @notice Enquiry current ruling.
     * @param _metaEvidenceId The id of the project arbitration for which to query the delta.
     * @dev return current ruling.
     */
    function currentRuling(uint256 _metaEvidenceId) public returns (uint256 ruling) {
        Types.TX storage transaction = txs[_metaEvidenceId];

        return IArbitrator(arbitratorAddress).currentRuling(transaction.disputeID);
    }
}