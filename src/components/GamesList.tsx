import * as React from 'react';
import Subheader from 'material-ui/Subheader';
import { GridList, GridTile } from 'material-ui/GridList';
import { GameInfo } from '../types';
import { ourFirebase } from '../services/firebase';
import { withRouter } from 'react-router-dom';

const styles: any = {
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around'
  },
  gridList: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflowY: 'auto'
  }
};

interface Props {
  gamesList: GameInfo[];
  match: any;
  location: any;
  history: any;
}

/**
 * TODOS:
 * 5. onClick of any of the grid tile dispatch an action which changes the currently selected game
 * and reroutes to that game's route.
 */
class GamesList extends React.Component<Props, {}> {
  createMatch = (game: GameInfo) => {
    let matchId = ourFirebase.createMatch(game).matchId;
    console.log("MATCH ID: ", matchId);
    this.props.history.push('/matches/' + matchId);
  };

  render() {
    return (
      <div>
        {
          <div style={styles.root}>
            <GridList cellHeight={180} style={styles.gridList}>
              <Subheader>Card games</Subheader>
              {this.props.gamesList.map((gameInfo: GameInfo) => (
                <div
                  key={gameInfo.gameSpecId}
                  onClick={() => this.createMatch(gameInfo)}
                >
                  <GridTile
                    title={gameInfo.gameName}
                    subtitle={''}
                  >
                    <img src={gameInfo.screenShot.downloadURL} />
                  </GridTile>
                </div>
              ))}
            </GridList>
          </div>
        }
      </div>
    );
  }
}

import { connect } from 'react-redux';
import { StoreState } from '../types/index';

const mapStateToProps = (state: StoreState) => ({
  gamesList: state.gamesList
});
// Later this will take dispatch: any as argument
const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(GamesList));
