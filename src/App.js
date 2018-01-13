import React, { Component } from 'react'
import contract from 'truffle-contract'
import TicTacToeGameManagerArtifact from '../build/contracts/TicTacToeGameManager.json'
import TicTacToeGameArtifact from '../build/contracts/TicTacToeGame.json'
import getWeb3 from './utils/getWeb3'

import './App.css'

const TicTacToeGameManager = contract(TicTacToeGameManagerArtifact)
const TicTacToeGame = contract(TicTacToeGameArtifact)
const allContracts = [
  TicTacToeGameManager,
  TicTacToeGame,
]

function parseBoardStateValue(value) {
  const bits = value.toNumber()
  return {
    positions: Array.from({ length: 9 }, (_, i) => (bits >> (i << 1)) & 3),
    turn: (bits >> 18) & 1,
    winner: (bits >> 19) & 3,
    raw: bits,
  }
}

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      errors: [],
      games: [],
    }
  }

  // setStateAsync(updater) {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       this.setState(updater, resolve)
  //     } catch(e) {
  //       reject(e)
  //     }
  //   })
  // }

  async componentWillMount() { try {
    this.boardStateWatcherIntervalID = setInterval(async () => {
      if(this.state.web3) {
        await this.refreshAddress(this.state.web3)

        if(this.state.games) {
          const changedGamesInfo = (await Promise.all(this.state.games.map(game =>
            game.contract.boardState().then(s => [game, s]))))
            .filter(([game, newState]) => game.boardState.raw !== newState.toNumber())

          if(changedGamesInfo.length > 0) {
            this.setState(prevState => ({
              games: prevState.games.map(game => {
                const found = changedGamesInfo.find(([{ contract: { address } }]) => address === game.contract.address)
                if(found == null) { return game }
                return {
                  contract: game.contract,
                  boardState: parseBoardStateValue(found[1]),
                }
              })
            }))
          }
        }
      }
    }, 1000)

    const web3 = await getWeb3
    this.setState({ web3 });

    allContracts.forEach(contract => {
      contract.setProvider(web3.currentProvider)
    })

    // if(web3.eth.defaultAccount == null) {
      this.refreshAddress(web3)
    // }

    const ticTacToeGameManager = await TicTacToeGameManager.deployed()
    console.log('got game manager', ticTacToeGameManager.address)
    this.setState({ ticTacToeGameManager })
    await this.refreshGameList(ticTacToeGameManager)
  } catch(e) { this.componentDidCatch(e) } }

  componentWillUnmount() {
    clearInterval(this.boardStateWatcherIntervalID);

    // if(this.state.chainWatcherTimeoutID != null) {
    //   clearTimeout(this.state.chainWatcherTimeoutID)
    //   this.setState({ chainWatcherTimeoutID: null })
    // }
  }

  componentDidCatch(error, info) {
    this.setState({ errors: this.state.errors.concat([error]) })
    console.error(error)
    if(info != null) console.info(info)
  }

  async refreshAddress(web3) {
    // const availableAccounts = web3.eth.accounts
    const availableAccounts = await web3.accounts()

    if(availableAccounts.length > 0 && this.state.ownAddress !== availableAccounts[0]) {
      this.setState({ ownAddress: availableAccounts[0] })
    }

    // if(availableAccounts.length > 0) {
    //   // eslint-disable-next-line react/no-direct-mutation-state
    //   web3.eth.defaultAccount = availableAccounts[0]
    // }

    // if(this.state.ownAddress !== web3.eth.defaultAccount)
    //   this.setState({ ownAddress: web3.eth.defaultAccount })
  }

  async refreshGameList(ticTacToeGameManager) {
    let gameAddress = await ticTacToeGameManager.lastGame()
    const games = []
    for(let i = 0; i < 10; i++) {
      // eslint-disable-next-line eqeqeq
      if(gameAddress == 0) break;
      const contract = await TicTacToeGame.at(gameAddress)
      const boardState = parseBoardStateValue(await contract.boardState())
      games.push({ contract, boardState })
      gameAddress = await contract.previousGame()
    }
    this.setState({ games })
  }

  render() {
    return (
      <div>
        <h1>Ethereum Tic‑tac‑toe</h1>
        { this.state.errors.length > 0 && <div>
          <button onClick={ () => { this.setState({ errors: [] }) } }>Clear error messages</button>
          <ul>
            { this.state.errors.map((error, i) => <li key={i}>{ error.toString() }</li>) }
          </ul>
        </div> }

        <div>
          <button onClick={ async () => { try {
            await this.refreshAddress(this.state.web3)
          } catch(e) { this.componentDidCatch(e) } } }>↻</button>
          { this.state.ownAddress == null ?
            <span>Own address not found.</span> :
            <span>Own address: {this.state.ownAddress}</span> }
        </div>

        <div>
          <button onClick={
            async () => { try {
              const lastGame = await this.state.ticTacToeGameManager.lastGame()
              const res = await this.state.ticTacToeGameManager.startNewGame({ from: this.state.ownAddress })
              if(!res || !res.logs || res.logs[0].event !== 'TicTacToeGameCreation') {
                throw new Error(`Could not start new game with transaction ${res.receipt.transactionHash}`)
              }
              // console.log(res.logs[0].args.game)
              // console.log(res.tx)
              while(lastGame === await this.state.ticTacToeGameManager.lastGame());
              // console.log((await this.state.web3.getTransactionByHash(res.tx)).blockNumber.toString())
              // for (let i = 0; i < 10; i++) {
              //   await delay(100)
              //   console.log((await this.state.web3.blockNumber()).toString())
              // }
              await this.refreshGameList(this.state.ticTacToeGameManager)
            } catch(e) { this.componentDidCatch(e) } }
          } disabled={ !this.state.ticTacToeGameManager || !this.state.ownAddress }>Start game</button>
          <button onClick={
            async () => { try {
              await this.refreshGameList(this.state.ticTacToeGameManager)
            } catch(e) { this.componentDidCatch(e) } }
          } disabled={ !this.state.ticTacToeGameManager }>↻ games</button>
        </div>

        { this.state.games.map(game => <div key={game.contract.address} className="game">
          <div>Game address: {game.contract.address}</div>
          <div>Turn: { ['×', '○'][game.boardState.turn] }</div>
          { game.boardState.winner !== 0 && <div>Winner: { game.boardState.winner === 1 ? '×' : '○' }</div>}
          <table><tbody>{
            Array.from({ length: 3 }, (_, i) => <tr key={i}>{
              Array.from({ length: 3 }, (_, j) => <td key={j}>
                <button disabled={
                  !this.state.ticTacToeGameManager || !this.state.ownAddress ||
                  game.boardState.winner !== 0 ||
                  game.boardState.positions[i * 3 + j] !== 0
                } onClick={
                  async () => { try {
                    const res = await game.contract[`put${ ['X', 'O'][game.boardState.turn] }`](i * 3 + j, { from: this.state.ownAddress })
                    if(!res || !res.logs || res.logs[0].event !== 'Put') {
                      throw new Error(`Could not put ${
                        ['×', '○'][game.boardState.turn]
                      } on position ${ i * 3 + j } in game ${ game.contract.address }`)
                    }
                    // await delay()
                    // const newBoardState = parseBoardStateValue(await game.contract.boardState())
                    // this.setState(prevState => {
                    //   const gameIndex = prevState.games.findIndex(({ contract: { address } }) => address = game.contract.address)
                    //   if(gameIndex !== -1) {
                    //     const newGames = prevState.games.slice()
                    //     const newGame = Object.assign({}, newGames[gameIndex])
                    //     newGame.boardState = newBoardState
                    //     newGames[gameIndex] = newGame

                    //     return { games: newGames }
                    //   }
                    // })
                  } catch(e) { this.componentDidCatch(e) } }
                }>{
                  ['', '×', '○'][game.boardState.positions[i * 3 + j]]
                }</button>
              </td>)
            }</tr>)
          }
          </tbody></table>
        </div>)}
      </div>
    )
  }
}

export default App
