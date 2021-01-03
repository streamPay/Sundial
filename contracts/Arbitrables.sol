pragma solidity 0.5.16;

import "./interface/IArbitrator.sol";

contract Arbitrables{

    /**
     * @notice Address of IArbitrator.
     */
    address arbitratorAddress;

    constructor() public {
        arbitratorAddress = address(0x6A498861dD1f4e9C58Aa6a5Eee34C45aA890Df9E);
    }




    /**
     * @notice Enquiry appeal cost.
     * @param disputeID The id of the project arbitration for which to query the delta.
     * @dev return appeal cost.
     */
    function appealCost(uint256 disputeID) public view returns (uint256) {
        return IArbitrator(arbitratorAddress).appealCost(disputeID, "");
    }

    /**
     * @notice Enquiry appeal period.
     * @param disputeID The id of the project arbitration for which to query the delta.
     * @dev return appeal period.
     */
    function appealPeriod(uint256 disputeID) external view returns (uint256 start, uint256 end) {
        (start, end) =  IArbitrator(arbitratorAddress).appealPeriod(disputeID);
        return(start, end);
    }

    /**
     * @notice Enquiry dispute status.
     * @param disputeID The id of the project arbitration for which to query the delta.
     * @dev return dispute status.
     */
    function disputeStatus(uint256 disputeID) external view returns (IArbitrator.DisputeStatus status) {
        status =  IArbitrator(arbitratorAddress).disputeStatus(disputeID);
        return status;
    }

    /**
     * @notice Enquiry current ruling.
     * @param disputeID The id of the project arbitration for which to query the delta.
     * @dev return current ruling.
     */
    function currentRuling(uint256 disputeID) external view returns (uint256 ruling) {
        return IArbitrator(arbitratorAddress).currentRuling(disputeID);
    }

    /**
     * @notice Enquiry arbitration cost.
     * @dev return arbitration cost.
     */
    function arbitrationCost() public view returns (uint256) {
        return IArbitrator(arbitratorAddress).arbitrationCost("");
    }
}
