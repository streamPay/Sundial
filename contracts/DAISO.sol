// SPDX-License-Identifier: MIT


pragma solidity 0.8.4;

import "./openzeppelin/token/ERC20/IERC20Upgradeable.sol";
import "./openzeppelin/security/ReentrancyGuardUpgradeable.sol";

import "./tools-contracts/OwnableUpgradeable.sol";
import "./tools-contracts/SafeMath.sol";

import './Types.sol';

import "./interface/DAISOInterface.sol";
import "./interface/IArbitrator.sol";
import "./interface/IArbitrable.sol";
import "./interface/erc-1497/IEvidence.sol";


contract DAISO is IArbitrable, IEvidence, OwnableUpgradeable, ReentrancyGuardUpgradeable, DAISOInterface{
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
     * @notice Counter for EvidenceGroup ids.
     */
    uint256 public nextEvidenceGroup;

    /**
     * @notice Counter for MetaEvidence ids.
     */
    uint256 public nextMetaEvidenceID;

    /**
     * @notice Address of IArbitrator.
     */
    address arbitratorAddress;
    
    /**
     * @notice Calculation project balance.
     */
    mapping(uint256 => Types.CalProjectBalance) public calProjectBalances;

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
            "NOT_INVEST_SENDER"
        );
        _;
    }

    /**
     * @dev Throws if the caller is not the sender of the project stream.
     */
    modifier onlyProject(uint256 projectId) {
        require(
            msg.sender == projects[projectId].sender,
            "NOT_PROJECT_SENDER"
        );
        _;
    }

    /**
     * @dev Throws if the stream id does not point to a valid stream.
     */
    modifier investExists(uint256 streamId) {
        require(streams[streamId].sender != address(0x0), "STREAM_NOT_EXIT");
        _;
    }

    /**
     * @dev Throws if the project id does not point to a valid stream.
     */
    modifier projectExists(uint256 projectId) {
        require(projects[projectId].sender != address(0x0), "PROJECT_NOT_EXIT");
        _;
    }

    /*** Contract Logic Starts Here */

    constructor() {
        OwnableUpgradeable.__Ownable_init();
        arbitratorAddress = address(0x60B2AbfDfaD9c0873242f59f2A8c32A3Cc682f80);
        nextStreamId = 1;
        nextProjectId = 1;
        nextEvidenceGroup = 1;
        nextMetaEvidenceID = 1;
    }
    
    /*** Update Arbitration Address */
    function updateArbitratorAddress(address arbitrator) external onlyOwner {
        arbitratorAddress = arbitrator;
    }

    /*** Project Functions ***/

    /**
     * @notice Creates a new project stream for sell xDAI to fund DAI.
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
        returns (uint256)
    {
        require(projectSellTokenAddress != projectFundTokenAddress,"SELLTOKEN_SAME_FUNDTOKEN");
        require(projectSellDeposit > 0,"PROJECTSELLDEPOSIT_IS_ZERO");
        require(projectFundDeposit > 0,"PEOJECTFUNDDEPOSIT_IS_ZERO");
        require(startTime >= block.timestamp, "STARTTIME_BEFORE_NOW");
        require(stopTime > startTime, "STOPTIME_BEFORE_STARTTIME");
        require(lockPeriod > 0, "LOCKPERIOD_IS_ZERO");

        uint256 projectId = nextProjectId;

        projects[projectId] = Types.Project({
            projectSellDeposit: projectSellDeposit,
            projectFundDeposit: projectFundDeposit,
            projectActualSellDeposit: 0,
            projectActualFundDeposit: 0,
            projectWithdrawalAmount:0,
            sender: payable(msg.sender),
            startTime: startTime,
            stopTime: stopTime,
            projectSellTokenAddress: projectSellTokenAddress,
            projectFundTokenAddress: projectFundTokenAddress,
            streamId: new uint256[](0),
            lockPeriod: lockPeriod,
            hash: hash,
            refunded:0
        });

        cancelProjectForInvests[projectId].exitStopTime = stopTime;
        nextProjectId = nextProjectId + 1;

        require(IERC20Upgradeable(projectSellTokenAddress).transferFrom(msg.sender, address(this), projectSellDeposit), "TOKEN_TREANSFER_FAILURE");
        emit CreateProject(projectId, msg.sender, hash);
        return projectId;
    }

    /**
     * @notice Returns the sellToken balance and fundToken balance for project.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for which to query the balance.
     * @return projectSellBalance is stream balance for project SellToken.
     * @return projectFundBalance is stream balance for project FundToken.
     */
    function projectBalanceOf(uint256 projectId) external view projectExists(projectId) returns (uint256 projectSellBalance, uint256 projectFundBalance) {
        Types.Project storage project = projects[projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];
        Types.CalProjectBalance storage calProjectBalance = calProjectBalances[projectId];

        if (cancelProjectForInvest.proposalForCancelStatus == 1) {
            projectSellBalance = cancelProjectForInvest.exitProjectSellBalance;
            projectFundBalance = 0;
        } else {
            if (block.timestamp <= project.startTime){
                projectSellBalance = project.projectActualSellDeposit;
                projectFundBalance = 0;
            } else if (block.timestamp < project.stopTime){
               if (project.projectActualSellDeposit > 0) {
                    uint256 delta = block.timestamp.sub(project.startTime);
                    uint256 investFundBalance = delta.mul(calProjectBalance.sumOfRatePerSecondOfInvestFund);
                    investFundBalance = investFundBalance.sub(calProjectBalance.sumOfCalBalance);
                    investFundBalance = investFundBalance.add(calProjectBalance.sumOfCancelInvestor);

                    projectSellBalance = project.projectActualSellDeposit.sub(investFundBalance);

                    projectFundBalance = project.projectActualFundDeposit.mul(projectSellBalance);
                    projectFundBalance = projectFundBalance.div(project.projectActualSellDeposit);
                    projectFundBalance = project.projectActualFundDeposit.sub(projectFundBalance);
                    projectFundBalance = projectFundBalance.sub(project.projectWithdrawalAmount);
                } else {
                    projectSellBalance = 0;
                    projectFundBalance = 0;
                }
            } else {
                projectSellBalance = 0;
                projectFundBalance = project.projectActualFundDeposit;
                projectFundBalance = projectFundBalance.sub(project.projectWithdrawalAmount);
            }

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
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];

        require(block.timestamp >= project.stopTime.add(project.lockPeriod),"FAIL_REACH_UNLOCKPERIOD");
        require(project.refunded == 0,"ALREADY_REFUND");

        uint256 refunds = project.projectSellDeposit.sub(project.projectActualSellDeposit);
        uint256 projectSellBalance = refunds.add(cancelProjectForInvest.exitProjectSellBalance);

        projects[projectId].refunded = 1;

        if (projectSellBalance > 0)
            require(IERC20Upgradeable(project.projectSellTokenAddress).transfer(project.sender, projectSellBalance), "TOKEN_TREANSFER_FAILURE");

        emit CancelProjectForProject(projectId, projectSellBalance);
        return true;
    }

    /**
     * @notice Withdraws from the contract to the Project's account.
     * @dev Throws if the id does not point to a valid stream.
     *  Throws if caller is not project.
     *  Throws if the amount exceeds the available balance.
     *  Throws if there is a token transfer failure.
     * @param projectId The id of the project to withdraw tokens from.
     * @param amount The amount of tokens to withdraw.
     * @return bool true=success, otherwise false.
     */
    function withdrawFromProject(uint256 projectId, uint256 amount)
        external
        nonReentrant
        projectExists(projectId)
        onlyProject(projectId)
        returns (bool)
    {
        require(amount > 0, "AMOUNT_IS_ZERO");
        (,uint256 balance) = this.projectBalanceOf(projectId);
        require(balance >= amount, "BALANCE_SMALLER_AMOUNT");

        Types.Arbitration storage arbitration = arbitrations[projectId];
        Types.Project storage project = projects[projectId];

        require(arbitration.reclaimedAt == 0, "PROJECT_HAS_ARBITRATION");

        projects[projectId].projectWithdrawalAmount = project.projectWithdrawalAmount.add(amount);

        require(IERC20Upgradeable(project.projectFundTokenAddress).transfer(project.sender, amount), "TOKEN_TREANSFER_FAILURE");
        emit WithdrawFromProject(projectId, project.sender, block.timestamp, amount);

        return true;
    }


    /*** Investor Functions ***/
    
    struct CreateStreamLocalVars {
        uint256 time;
        uint256 calBalance;
        uint256 startTime;
        uint256 duration;
        uint256 ratePerSecondOfInvestSell;
        uint256 ratePerSecondOfInvestFund;
    }

    /**
     * @notice Creates a new stream for invest project by investors;.
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
        returns (uint256)
    {
        Types.Project storage project = projects[projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];
        CreateStreamLocalVars memory vars;

        require(msg.sender != project.sender,"SENDER_SAME_PROJECT");
        require(investSellDeposit > 0, "INVESTSELLDEPOSIT_IS_ZERO");
        require(block.timestamp < cancelProjectForInvest.exitStopTime, "NOW_BIGGER_STOPTIME");

        projects[projectId].projectActualFundDeposit = project.projectActualFundDeposit.add(investSellDeposit);
        require(project.projectFundDeposit >= projects[projectId].projectActualFundDeposit, "EXCEED_PROJECTFUNDDEPOSIT");

        uint256 projectActualSellDeposit = projects[projectId].projectActualFundDeposit.mul(project.projectSellDeposit);
        projects[projectId].projectActualSellDeposit = projectActualSellDeposit.div(project.projectFundDeposit);

        uint256 investFundDeposit = investSellDeposit.mul(project.projectSellDeposit);
        investFundDeposit = investFundDeposit.div(project.projectFundDeposit);

        if (block.timestamp <= project.startTime){
            vars.startTime = project.startTime;
            vars.duration = project.stopTime.sub(vars.startTime);
            vars.ratePerSecondOfInvestSell = investSellDeposit.div(vars.duration);
            vars.ratePerSecondOfInvestFund = investFundDeposit.div(vars.duration);
        } else {
            vars.startTime = block.timestamp;
            vars.duration = project.stopTime.sub(vars.startTime);
            vars.ratePerSecondOfInvestSell = investSellDeposit.div(vars.duration);
            vars.ratePerSecondOfInvestFund = investFundDeposit.div(vars.duration);

            vars.time = vars.startTime.sub(project.startTime);
            vars.calBalance = vars.time.mul(vars.ratePerSecondOfInvestFund);
            calProjectBalances[projectId].sumOfCalBalance = calProjectBalances[projectId].sumOfCalBalance.add(vars.calBalance);
        }

        calProjectBalances[projectId].sumOfRatePerSecondOfInvestFund = calProjectBalances[projectId].sumOfRatePerSecondOfInvestFund.add(vars.ratePerSecondOfInvestFund);
        cancelProjectForInvests[projectId].sumForExistInvest = cancelProjectForInvests[projectId].sumForExistInvest.add(investSellDeposit);

        uint256 streamId = nextStreamId;

        streams[streamId] = Types.Stream({
            projectId: projectId,
            investSellDeposit: investSellDeposit,
            investFundDeposit: investFundDeposit,
            ratePerSecondOfInvestSell: vars.ratePerSecondOfInvestSell,
            ratePerSecondOfInvestFund: vars.ratePerSecondOfInvestFund,
            startTime: vars.startTime,
            stopTime: project.stopTime,
            sender: msg.sender,
            investWithdrawalAmount:0
        });

        nextStreamId = nextStreamId + 1;

        require(IERC20Upgradeable(project.projectFundTokenAddress).transferFrom(msg.sender, address(this), investSellDeposit), "TOKEN_TREANSFER_FAILURE");
        emit CreateStream(streamId, msg.sender);
        return streamId;
    }


    /**
     * @notice Returns either the delta in seconds between `block.timestamp` and `startTime` or
     *  between `exitStopTime` and `startTime, whichever is smaller. If `block.timestamp` iis starts before
     *  `startTime`, it returns 0.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the stream for which to query the delta.
     * @return delta is time delta in seconds.
     */
    function deltaOf(uint256 streamId) external view returns (uint256 delta) {
        Types.Stream storage stream = streams[streamId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[stream.projectId];

        if (cancelProjectForInvest.proposalForCancelStatus != 1) {
            if (block.timestamp <= stream.startTime) return 0;
            if (block.timestamp < stream.stopTime) return block.timestamp - stream.startTime;
            return stream.stopTime - stream.startTime;
        } else if (cancelProjectForInvest.proposalForCancelStatus == 1) {
            if (block.timestamp <= stream.startTime) return 0;
            if (block.timestamp < cancelProjectForInvest.exitStopTime) return block.timestamp - stream.startTime;
            return cancelProjectForInvest.exitStopTime - stream.startTime;
        }
    }

    /**
     * @notice Returns the sellToken balance and fundToken balance for invest.
     * @dev Throws if the id does not point to a valid stream.
     * @param streamId The id of the invest stream for balance.
     * @return investSellBalance is stream balance for invest SellToken.
     * @return investFundBalance is  stream balance for invest FundToken.
    */
    function investBalanceOf(uint256 streamId) external view investExists(streamId) returns (uint256 investSellBalance, uint256 investFundBalance) {
        Types.Stream storage stream = streams[streamId];
        Types.Project storage project = projects[stream.projectId];

        uint256 delta = this.deltaOf(streamId);
        investFundBalance = delta * stream.ratePerSecondOfInvestFund;

        if(block.timestamp >= project.stopTime) {
            investFundBalance = stream.investFundDeposit;
        }
        investFundBalance = investFundBalance.sub(stream.investWithdrawalAmount);

        investSellBalance = delta * stream.ratePerSecondOfInvestSell;

        if(block.timestamp >= project.stopTime) {
            investSellBalance = stream.investSellDeposit;
        }

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
        nonReentrant
        investExists(streamId)
        onlyInvest(streamId)
        returns (bool)
    {
        require(amount > 0, "AMOUNT_IS_ZERO");
        (,uint256 balance) = this.investBalanceOf(streamId);
        require(balance >= amount, "BALANCE_SMALLER_AMOUNT");

        Types.Stream storage stream = streams[streamId];
        Types.Project storage project = projects[stream.projectId];

        streams[streamId].investWithdrawalAmount = stream.investWithdrawalAmount.add(amount);

        require(IERC20Upgradeable(project.projectSellTokenAddress).transfer(stream.sender, amount), "TOKEN_TREANSFER_FAILURE");
        emit WithdrawFromInvest(streamId, stream.projectId, stream.sender, block.timestamp, amount);

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
     * Throws if the projectActualFundDeposit calculation has a math error.
     * Throws if the projectActualSellDeposit calculation has a math error.
     *  Throws if there is a projectFund token transfer failure.
     *  Throws if there is a projectSell token transfer failure.
     */
    function cancelInvestInternal(uint256 streamId) internal {
        Types.Stream storage stream = streams[streamId];
        Types.Project storage project = projects[stream.projectId];

        uint256 investSellBalance;
        uint256 investFundBalance;

        (investSellBalance,investFundBalance) = this.investBalanceOf(streamId);

        projects[stream.projectId].projectActualFundDeposit = project.projectActualFundDeposit.sub(investSellBalance);

        uint256 projectActualSellDeposit = projects[stream.projectId].projectActualFundDeposit.mul(project.projectSellDeposit);
        projects[stream.projectId].projectActualSellDeposit = projectActualSellDeposit.div(project.projectFundDeposit);

        cancelProjectForInvests[stream.projectId].sumForExistInvest = cancelProjectForInvests[stream.projectId].sumForExistInvest.sub(stream.investSellDeposit);

        calProjectBalances[stream.projectId].sumOfRatePerSecondOfInvestFund = calProjectBalances[stream.projectId].sumOfRatePerSecondOfInvestFund.sub(stream.ratePerSecondOfInvestFund);

        if (stream.startTime > project.startTime) {
            uint256 time = stream.startTime.sub(project.startTime);
            uint256 calBalance = time.mul(stream.ratePerSecondOfInvestFund);
            calProjectBalances[stream.projectId].sumOfCalBalance = calProjectBalances[stream.projectId].sumOfCalBalance.sub(calBalance);
        }

        uint256 investFund = investFundBalance.add(stream.investWithdrawalAmount);
        calProjectBalances[stream.projectId].sumOfCancelInvestor = calProjectBalances[stream.projectId].sumOfCancelInvestor.add(investFund);

        if (investSellBalance > 0)
            require(IERC20Upgradeable(project.projectFundTokenAddress).transfer(stream.sender, investSellBalance), "TOKEN_TREANSFER_FAILURE");
        if (investFundBalance > 0)
            require(IERC20Upgradeable(project.projectSellTokenAddress).transfer(stream.sender, investFundBalance), "TOKEN_TREANSFER_FAILURE");

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

        uint256 amount = cancelProjectForInvest.exitProjectFundBalance.mul(stream.investSellDeposit);
        amount = amount.div(cancelProjectForInvest.sumForExistInvest);

        (uint256 investSellBalance,uint256 investFundBalance) = this.investBalanceOf(streamId);

        investSellBalance = amount.add(investSellBalance);

        if (investSellBalance > 0)
            require(IERC20Upgradeable(project.projectFundTokenAddress).transfer(stream.sender, investSellBalance), "TOKEN_TREANSFER_FAILURE");
        if (investFundBalance > 0)
            require(IERC20Upgradeable(project.projectSellTokenAddress).transfer(stream.sender, investFundBalance), "TOKEN_TREANSFER_FAILURE");

        delete streams[streamId];

        emit CancelProject(stream.projectId, streamId, stream.sender, investSellBalance, investFundBalance,amount,block.timestamp);
    }

    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for getProject info.
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
            uint256 lockPeriod,
            string memory hash
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
        hash = projects[projectId].hash;
    }

    /**
     * @notice Returns the stream with all its properties.
     * @dev Throws if the stream id does not point to a valid invest stream.
     * @param streamId The id of the invest stream for get stream info.
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
            uint256 startTime,
            uint256 stopTime,
            uint256 investWithdrawalAmount,
            uint256 ratePerSecondOfInvestSell,
            uint256 ratePerSecondOfInvestFund
        )
    {
        projectId = streams[streamId].projectId;
        investSellDeposit = streams[streamId].investSellDeposit;
        investFundDeposit = streams[streamId].investFundDeposit;
        sender = streams[streamId].sender;
        startTime = streams[streamId].startTime;
        stopTime = streams[streamId].stopTime;
        investWithdrawalAmount = streams[streamId].investWithdrawalAmount;
        ratePerSecondOfInvestSell = streams[streamId].ratePerSecondOfInvestSell;
        ratePerSecondOfInvestFund = streams[streamId].ratePerSecondOfInvestFund;
    }

    /**
     * @notice Returns the project with all its properties.
     * @dev Throws if the project id does not point to a valid project stream.
     * @param projectId The id of the project stream for get CancelProjectForInvest info.
     */
    function getCancelProjectForInvest(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (
            uint256 exitProjectSellBalance,
            uint256 exitProjectFundBalance,
            uint256 exitStopTime,
            uint256 sumForExistInvest,
            uint256 proposalForCancelStatus
        )
    {
        exitProjectSellBalance = cancelProjectForInvests[projectId].exitProjectSellBalance;
        exitProjectFundBalance = cancelProjectForInvests[projectId].exitProjectFundBalance;
        exitStopTime = cancelProjectForInvests[projectId].exitStopTime;
        sumForExistInvest = cancelProjectForInvests[projectId].sumForExistInvest;
        proposalForCancelStatus = cancelProjectForInvests[projectId].proposalForCancelStatus;
    }
    
    function getCalProjectBalance(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (
            uint256 sumOfRatePerSecondOfInvestFund,
            uint256 sumOfCalBalance,
            uint256 sumOfCancelInvestor
        )
    {
        sumOfRatePerSecondOfInvestFund = calProjectBalances[projectId].sumOfRatePerSecondOfInvestFund;
        sumOfCalBalance = calProjectBalances[projectId].sumOfCalBalance;
        sumOfCancelInvestor = calProjectBalances[projectId].sumOfCancelInvestor;
    }

    function getArbitration(uint256 projectId)
        external
        view
        projectExists(projectId)
        returns (
            Types.Status status,
            uint256 disputeID,
            uint256 reclaimedAt,
            uint256 evidenceGroup,
            uint256 metaEvidenceID
        )
    {
        status = arbitrations[projectId].status;
        disputeID = arbitrations[projectId].disputeID;
        reclaimedAt = arbitrations[projectId].reclaimedAt;
        evidenceGroup = arbitrations[projectId].evidenceGroup;
        metaEvidenceID = arbitrations[projectId].metaEvidenceID;
    }

    /**
     * @notice invest create arbitration with project.
     * @param projectId The id of the project to create arbitration.
     * @param _metaEvidence The metaEvidence of arbitration.
     */
    function createArbitrationForInvestor(
        uint256 projectId,
        string memory _metaEvidence
    ) external projectExists(projectId) payable {
        /* verify msg.value is same as arbitrationCost*/
        require(msg.value == IArbitrator(arbitratorAddress).arbitrationCost(""),"MSGVALUE_NOT_SAME_ARBITRATIONCOST");

        Types.Project storage project = projects[projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];

        require(arbitrations[projectId].reclaimedAt == 0,"ALREADY_HAVE_ARBITRATION");
        require(block.timestamp >= project.startTime,"PROJECT_NOT_START");
        require(block.timestamp < cancelProjectForInvest.exitStopTime,"PROJECT_IS_FINISHED");
        require(block.timestamp >= cancelProjectForInvest.preReclaimedAt + 86400, "NOT_ARRIVE_24HOURS");

        uint256 _metaEvidenceID = nextMetaEvidenceID;

        arbitrations[projectId] = Types.Arbitration({
            invest: payable(msg.sender),
            project: project.sender,
            status: Types.Status.Reclaimed,
            disputeID: 0,
            evidenceGroup: 0,
            metaEvidenceID: _metaEvidenceID,
            reclaimedAt: block.timestamp,
            feeDeposit: msg.value,
            projectFeeDeposit: 0
        });

        nextMetaEvidenceID = nextMetaEvidenceID + 1;
        cancelProjectForInvests[projectId].preReclaimedAt = block.timestamp;

        emit MetaEvidence(_metaEvidenceID, _metaEvidence);
        emit Arbitration(projectId, _metaEvidenceID, _metaEvidence, project.sender, msg.sender,msg.value, block.timestamp);
    }

    /**
     * @notice investor reclaim funds when project not pay arbitration fee.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the arbitrations[projectId].status is not Reclaimed.
     *  Throws if the caller is not arbitration.invest.
     *  Throws if the now not exceeds arbitration.reclaimedAt + 86400(reclaimed time).
     * @param projectId The id of the project arbitration for which to query the delta.
     */
    function reclaimFunds(uint256 projectId) external nonReentrant returns(bool result){
        Types.Arbitration storage arbitration = arbitrations[projectId];

        require(arbitration.status == Types.Status.Reclaimed,"STATUS_NOT_RECLAIMED");
        require(block.timestamp - arbitration.reclaimedAt > 86400,"NOT_ARRIVAL_RECLAIMEDPERIOD");
        
        (uint256 exitProjectSellBalance, uint256 exitProjectFundBalance) = this.projectBalanceOf(projectId);
        cancelProjectForInvests[projectId].exitProjectSellBalance = exitProjectSellBalance;
        cancelProjectForInvests[projectId].exitProjectFundBalance = exitProjectFundBalance;

        if (block.timestamp <= cancelProjectForInvests[projectId].exitStopTime) {
            cancelProjectForInvests[projectId].exitStopTime = block.timestamp;
        }
        cancelProjectForInvests[projectId].proposalForCancelStatus = 1;

        arbitrations[projectId].status = Types.Status.Resolved;

        result = arbitration.invest.send(arbitration.feeDeposit);

        return result;
    }

    /**
     * @notice project pay arbitration fee.
     * @dev Throws if the arbitration id does not point to a valid project.
     *  Throws if the arbitration.status is not Reclaimed.
     *  Throws if the now exceeds arbitration.reclaimedAt + 86400(reclaimed time).
     * @param projectId The id of the project arbitration for which to query the delta.
     */
    function createDisputeForProject(uint256 projectId) external nonReentrant payable returns(bool) {
        Types.Arbitration storage arbitration = arbitrations[projectId];

        /* verify msg.value is same as arbitrationCost*/
        require(msg.value == IArbitrator(arbitratorAddress).arbitrationCost(""),"MSGVALUE_NOT_SAME_ARBITRATIONCOST");
        require(arbitration.status == Types.Status.Reclaimed, "STATUS_NOT_SAME_RECLAIMED");
        require(block.timestamp - arbitration.reclaimedAt <= 86400,"ARRIVAL_RECLAIMEDPERIOD");

        arbitrations[projectId].projectFeeDeposit = msg.value;
        arbitrations[projectId].status = Types.Status.Disputed;
        arbitrations[projectId].evidenceGroup = nextEvidenceGroup;
        
        arbitrations[projectId].disputeID = IArbitrator(arbitratorAddress).createDispute{value:msg.value}(2, "");

        nextEvidenceGroup = nextEvidenceGroup + 1;

        disputeIDtoArbitrationID[arbitration.disputeID] = projectId;

        emit Dispute(IArbitrator(arbitratorAddress), arbitrations[projectId].disputeID, arbitrations[projectId].metaEvidenceID, arbitrations[projectId].evidenceGroup);
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
    function rule(uint256 _disputeID, uint256 _ruling) override external nonReentrant {
        uint256 projectId = disputeIDtoArbitrationID[_disputeID];

        Types.Arbitration storage arbitration = arbitrations[projectId];
        Types.CancelProjectForInvest storage cancelProjectForInvest = cancelProjectForInvests[projectId];

        require(msg.sender == arbitratorAddress, "SENDER_NOT_SAME_ARBITRATOR");
        require(arbitration.status == Types.Status.Disputed, "STATUS_NOT_SAME_DISPUTED");
        require(_ruling <= 2, "RULING_BIGGER_2");

        bool result;
        if (_ruling == 1) {
            (uint256 exitProjectSellBalance, uint256 exitProjectFundBalance) = this.projectBalanceOf(projectId);
            cancelProjectForInvests[projectId].exitProjectSellBalance = exitProjectSellBalance;
            cancelProjectForInvests[projectId].exitProjectFundBalance = exitProjectFundBalance;
            
            cancelProjectForInvests[projectId].proposalForCancelStatus = 1;

            if (block.timestamp <= cancelProjectForInvest.exitStopTime) {
                cancelProjectForInvests[projectId].exitStopTime = block.timestamp;
            }

            result = arbitration.invest.send(arbitration.feeDeposit);
        } else if (_ruling == 2) {
            cancelProjectForInvests[projectId].proposalForCancelStatus = 2;
            result = arbitration.project.send(arbitration.feeDeposit);

            delete arbitrations[projectId];
        } else if (_ruling == 0) {
            uint256 fee = arbitration.feeDeposit.div(2);
            result = arbitration.invest.send(fee);
            result = arbitration.project.send(fee);

            delete arbitrations[projectId];
        }

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

        Types.Arbitration storage arbitration = arbitrations[projectId];

        emit Evidence(IArbitrator(arbitratorAddress), arbitration.evidenceGroup, msg.sender, _evidence);
    }

    /**
     * @notice project or investors appeal.
     * @dev Throws if the status is not Appealable.
     * @param projectId The id of the project arbitration for which to query the delta.
     */
    function appeal(uint256 projectId) external nonReentrant payable {
        Types.Arbitration storage arbitration = arbitrations[projectId];

        /* verify msg.value is same as appealCost*/
        require(msg.value == IArbitrator(arbitratorAddress).appealCost(arbitration.disputeID, ""),"MSGVALUE_NOT_SAME_APPEALCOST");

        IArbitrator.DisputeStatus status = IArbitrator(arbitratorAddress).disputeStatus(arbitration.disputeID);
        require(status == IArbitrator.DisputeStatus.Appealable,"STATUS_NOT_SAME_APPEALABLE");

        IArbitrator(arbitratorAddress).appeal{value:msg.value}(arbitration.disputeID, "");
    }
}
