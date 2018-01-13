const TicTacToeGameManager = artifacts.require("TicTacToeGameManager");

module.exports = function(deployer) {
    deployer.deploy(TicTacToeGameManager);
}
