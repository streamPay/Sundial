import Web3 from 'web3';
// console.log(ethereum,web3)
let web3
if (window.ethereum) {
    // eslint-disable-next-line
    web3 = new Web3(ethereum);
    try {
    // Request account access if needed
    // eslint-disable-next-line
        ethereum.enable();
    } catch (error) {
    // User denied account access...
    }
} else if (window.web3) {
    // Legacy dapp browsers...
    web3 = new Web3(web3.currentProvider);
} else {
    // Non-dapp browsers...
    // web3 = new Web3('HTTP://127.0.0.1:8545');
    alert('检测到未安装metamask插件');
    // console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
}
// let web3 = new Web3('HTTP://127.0.0.1:8545');

export default web3;