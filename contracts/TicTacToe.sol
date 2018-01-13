pragma solidity ^0.4.18;

contract TicTacToeGame {
    // Bitmap:
    // | 20    | 19    | 18   | 17                | 16                | ... | 1             | 0             |
    // | O win | X win | Turn | O in bottom-right | X in bottom-right | ... | O in top-left | X in top-left |
    uint24 public boardState;
    TicTacToeGame public previousGame;
    // address public playerX;
    // address public playerO;

    enum Player { Unknown, X, O }

    event Put(Player player, uint8 position);

    function TicTacToeGame(TicTacToeGame _previousGame) public {
        previousGame = _previousGame;
    }

    function getWinner() public view returns (Player)
    {
        if(
            boardState & 0x15000 == 0x15000 ||
            boardState & 0x00540 == 0x00540 ||
            boardState & 0x00015 == 0x00015 ||
            boardState & 0x10410 == 0x10410 ||
            boardState & 0x04104 == 0x04104 ||
            boardState & 0x01041 == 0x01041 ||
            boardState & 0x10101 == 0x10101 ||
            boardState & 0x01110 == 0x01110
        ) {
            return Player.X;
        }

        if(
            boardState & 0x2a000 == 0x2a000 ||
            boardState & 0x00a80 == 0x00a80 ||
            boardState & 0x0002a == 0x0002a ||
            boardState & 0x20820 == 0x20820 ||
            boardState & 0x08208 == 0x08208 ||
            boardState & 0x02082 == 0x02082 ||
            boardState & 0x20202 == 0x20202 ||
            boardState & 0x02220 == 0x02220
        ) {
            return Player.O;
        }

        return Player.Unknown;
    }

    function putX(uint8 pos) public
    {
        require(//msg.sender == playerX &&
            boardState & 0x40000 == 0 && pos < 9 &&
            (boardState >> (pos << 1)) & 3 == 0 &&
            boardState & 0x180000 == 0);
        boardState ^= 0x40000 | (uint24(1) << (pos << 1));
        Player winner = getWinner();
        if(winner != Player.Unknown) {
            // assert(winner == Player.X);
            boardState |= 0x80000;
        }
        Put(Player.X, pos);
    }

    function putO(uint8 pos) public
    {
        require(//msg.sender == playerO &&
            boardState & 0x40000 != 0 && pos < 9 &&
            (boardState >> (pos << 1)) & 3 == 0 &&
            boardState & 0x180000 == 0);
        boardState ^= 0x40000 | (uint24(1) << ((pos << 1) + 1));
        Player winner = getWinner();
        if(winner != Player.Unknown) {
            // assert(winner == Player.O);
            boardState |= 0x100000;
        }
        Put(Player.O, pos);
    }

}

contract TicTacToeGameManager {
    TicTacToeGame public lastGame;

    event TicTacToeGameCreation(TicTacToeGame game);

    function TicTacToeGameManager() public {
    }

    function startNewGame() public returns (TicTacToeGame newGame) {
        newGame = new TicTacToeGame(lastGame);
        TicTacToeGameCreation(newGame);
        lastGame = newGame;
    }
}
