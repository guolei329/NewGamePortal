import * as React from 'react';
import { Layer, Stage } from 'react-konva';
import { MatchInfo, GameSpec } from '../types';
import CanvasImage from './CanvasImage';

import { IconButton, IconMenu, MenuItem } from 'material-ui';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import { connect } from 'react-redux';
import { StoreState } from '../types/index';
import { ourFirebase } from '../services/firebase';
import { MatchStateHelper } from '../services/matchStateHelper';
import { isIos, isAndroid, deepCopy } from '../globals';

const saudio = require('../sounds/drag-start.mp3');
const daudio = require('../sounds/dice.mp3');
const eaudio = require('../sounds/click.mp3');

interface BoardProps {
  myUserId: string;
  gameSpec: GameSpec;
  matchInfo: MatchInfo;
  audioMute: boolean;
}

interface BoardState {
  showCardOptions: boolean;
  innerWidth: number;
  innerHeight: number;
  selectedPieceIndex: number;
  tooltipPosition: {
    x: number;
    y: number;
  };
  throttled: boolean;
  animatingTime: number;
  timer: any;
}

let diceAudio = new Audio(daudio);
let dragStartAudio = new Audio(saudio);
let dragEndAudio = new Audio(eaudio);

/**
 * A reusable board class, that given a board image and pieces in props
 * can draw the board and piece on top of it using konva.
 * Should also add drag and drop functionality later on.
 */
class Board extends React.Component<BoardProps, BoardState> {
  mutableMatch: MatchInfo = null as any;
  helper: MatchStateHelper = null as any;

  // TODO: don't use a constructor in react.
  constructor(props: BoardProps) {
    super(props);
    this.state = {
      showCardOptions: false,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      selectedPieceIndex: -1,
      tooltipPosition: {
        x: 0,
        y: 0
      },
      // for throttling window resize event
      throttled: false,
      animatingTime: 0.5,
      timer: null
    };
  }

  audioPlaying(sound: HTMLAudioElement) {
    if ((isAndroid || isIos) && !this.props.audioMute) {
      let playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise
          .then(function() {
            // Automatic playback started!
          })
          .catch(function(error: any) {
            // Automatic playback failed.
            // Show a UI element to let the user manually start playback.
            console.log(error);
            console.log('fail to open the soundtrack');
          });
      }
    }
  }

  selfParticipantIndex() {
    return this.props.matchInfo.participantsUserIds.indexOf(
      this.props.myUserId
    );
  }

  componentWillUpdate(nextProps: BoardProps) {
    const prevMatchState = this.mutableMatch.matchState;
    const nextMatchState = nextProps.matchInfo.matchState;
    for (let i = 0; i < nextMatchState.length; i++) {
      const imageNode = (this.refs['canvasImage' + i] as CanvasImage).imageNode;
      const kind = this.props.gameSpec.pieces[i].element.elementKind;
      if (
        prevMatchState[i].x !== nextMatchState[i].x ||
        prevMatchState[i].y !== nextMatchState[i].y
      ) {
        // the position is changed. Call animation.
        const ratio = this.state.innerWidth / this.props.gameSpec.board.width;
        imageNode.to({
          duration: this.state.animatingTime,
          x: nextMatchState[i].x / 100 * this.state.innerWidth,
          y:
            nextMatchState[i].y / 100 * this.props.gameSpec.board.height * ratio
        });
      } else if (
        kind === 'card' &&
        prevMatchState[i].cardVisibilityPerIndex[
          this.selfParticipantIndex()
        ] !==
          nextMatchState[i].cardVisibilityPerIndex[this.selfParticipantIndex()]
      ) {
        // the card is flipped. Call animation.
        this.handleAnimation(i);
      } else if (
        kind === 'toggable' &&
        prevMatchState[i].currentImageIndex !==
          nextMatchState[i].currentImageIndex
      ) {
        // the piece is toggled. Call animation.
        this.handleAnimation(i);
      } else if (
        kind === 'dice' &&
        prevMatchState[i].zDepth !== nextMatchState[i].zDepth
      ) {
        // To notify the firebase that someone has rolled a dice
        // (so that other users can see a rolling dice animation)
        // we add the z-depth of dice
        // So if z-depth is changed, that means the dice is rolled. Call animation.
        this.handleAnimation(i);
      }
    }
    this.mutableMatch = deepCopy(nextProps.matchInfo);
    console.log('componentWillUpdate test');
  }

  componentWillMount() {
    this.mutableMatch = deepCopy(this.props.matchInfo);
    if (this.mutableMatch.matchState.length === 0) {
      this.mutableMatch.matchState = MatchStateHelper.createInitialState(
        this.props.gameSpec
      );
      ourFirebase.updateMatchState(this.mutableMatch);
    }
  }

  // resize the board (also for correctly displaying on mobile)
  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    // make sure to clear the timer before unmounting
    if (this.state.timer) {
      clearTimeout(this.state.timer);
    }
  }

  handleAnimation(index: number) {
    const imageNode = (this.refs['canvasImage' + index] as CanvasImage)
      .imageNode;
    imageNode.to({
      duration: this.state.animatingTime,
      rotation: imageNode.rotation() + 720
    });
  }

  handleResize = () => {
    if (!this.state.throttled) {
      this.setDimensions();
      let timer = setTimeout(
        () => this.setState({ timer: null, throttled: false }),
        250
      );
      this.setState({
        throttled: true,
        timer
      });
    }
  };

  setDimensions() {
    this.setState({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight
    });
  }

  // check if a card belongs to a deck
  isDeck(index: number | undefined) {
    if (index === undefined) {
      return false;
    }
    if (this.props.gameSpec.pieces[index].deckPieceIndex === -1) {
      return false;
    } else {
      return true;
    }
  }

  // cycles through the images of each piece
  togglePiece(index: number) {
    const match: MatchInfo = this.mutableMatch;
    this.helper.toggleImage(index);
    ourFirebase.updatePieceState(match, index);
    console.log('toggle Piece index:', index);
  }

  // TODO: add animations for:
  // - dice roll, toggable piece, cards shuffles, card flips, drag-and-drop.
  // (note that the drag-and-drop animation should only happen for opponents, and not
  // for the person that did the dragging.)
  // TODO: add appropriate sounds for all the above, and add button in the AppHeader
  // to turn sound on/off.

  rollDice(index: number) {
    console.log('Roll Dice for index:', index);
    this.audioPlaying(diceAudio);
    const match: MatchInfo = this.mutableMatch;
    this.helper.rollDice(index);
    ourFirebase.updatePieceState(match, index);
  }

  shuffleDeck(deckIndex: number) {
    const match: MatchInfo = this.mutableMatch;
    this.helper.shuffleDeck(deckIndex);
    this.setState({
      selectedPieceIndex: -1,
      showCardOptions: false
    });
    ourFirebase.updateMatchState(match);
    console.log('Shufle Deck for index:');
  }

  handleTouchEnd = (
    index: number,
    kind: string,
    startX: number,
    startY: number,
    ratio: number
  ) => {
    let position = (this.refs[
      'canvasImage' + index
    ] as CanvasImage).imageNode.getAbsolutePosition();

    let width = this.props.gameSpec.board.width;
    let height = this.props.gameSpec.board.height;

    let endX = position.x / ratio / width * 100;
    let endY = position.y / ratio / height * 100;
    let distance = Math.sqrt(
      (startX - endX) * (startX - endX) + (startY - endY) * (startY - endY)
    );

    console.log('distance' + distance);
    if (distance < 0.00001) {
      // it's a touch instead of drag
      if (kind === 'toggable') {
        this.togglePiece(index);
      } else if (kind === 'dice') {
        this.rollDice(index);
      } else if (kind === 'card') {
        this.toggleCardOptions('canvasImage' + index, index);
      }
    } else {
      // it's a drag
      this.helper.dragTo(index, endX, endY);
      const match: MatchInfo = this.mutableMatch;
      ourFirebase.updatePieceState(match, index);
    }
  };

  makeCardVisibleToSelf(index: number) {
    const match: MatchInfo = this.mutableMatch;
    if (
      !match.matchState[index].cardVisibilityPerIndex[
        this.selfParticipantIndex()
      ]
    ) {
      this.helper.showMe(index);
      ourFirebase.updatePieceState(match, index);
      console.log('card show to me:', index);
    }
  }

  makeCardVisibleToAll(index: number) {
    const match: MatchInfo = this.mutableMatch;
    this.helper.showEveryone(index);
    ourFirebase.updatePieceState(match, index);
    console.log('card show to everyone:', index);
  }

  makeCardHiddenToAll(index: number) {
    const match: MatchInfo = this.mutableMatch;
    this.helper.hideFromEveryone(index);
    ourFirebase.updatePieceState(match, index);
    console.log('card hide to everyone:', index);
  }

  toggleCardOptions(refString: string, cardIndex: number) {
    if (
      this.state.showCardOptions &&
      this.state.selectedPieceIndex === cardIndex
    ) {
      // if we click on an already selected piece,
      // and the tooltip is not hided due to drag, then hide it
      this.hideCardOptions();
    } else {
      const imageNode = (this.refs[refString] as CanvasImage).imageNode;
      let position = imageNode.getAbsolutePosition();
      this.setState({
        tooltipPosition: {
          // x: position.x - imageNode.width()/2,
          // y: position.y - imageNode.height()/2
          x: position.x,
          y: position.y
        },
        showCardOptions: true,
        selectedPieceIndex: cardIndex
      });
    }
  }

  hideCardOptions() {
    console.log('hideCardOptions');
    this.setState({
      selectedPieceIndex: -1,
      showCardOptions: false
    });
  }

  render() {
    console.log('render test');
    let boardImage = this.props.gameSpec.board.downloadURL;
    const width = this.props.gameSpec.board.width;
    const height = this.props.gameSpec.board.height;
    const ratio = this.state.innerWidth / width;
    this.helper = new MatchStateHelper(this.mutableMatch);

    let boardLayer = (
      <CanvasImage
        height={height * ratio}
        width={width * ratio}
        src={boardImage}
        onTouchStart={() => this.hideCardOptions()}
      />
    );

    let piecesLayer = this.mutableMatch.matchState.map((piece, index) => {
      const pieceSpec = this.props.gameSpec.pieces[index];
      let kind = pieceSpec.element.elementKind;
      let isVisible = piece.cardVisibilityPerIndex[this.selfParticipantIndex()];
      let imageIndex: number =
        pieceSpec.element.elementKind === 'card'
          ? isVisible
            ? 0
            : 1
          : piece.currentImageIndex;
      let zIndex = isVisible ? 50 : 1;
      let imageSrc: string = pieceSpec.element.images[imageIndex].downloadURL;
      console.log('zIndex is: ', zIndex);
      return (
        <CanvasImage
          ref={'canvasImage' + index}
          key={index}
          draggable={pieceSpec.element.isDraggable || kind === 'standard'}
          height={pieceSpec.element.height * ratio}
          width={pieceSpec.element.width * ratio}
          x={piece.x * width / 100 * ratio}
          y={piece.y * height / 100 * ratio}
          src={imageSrc}
          z-index={zIndex}
          // offsetX={pieceSpec.element.width * ratio / 2}
          // offsetY={pieceSpec.element.height * ratio / 2}
          onTouchStart={() => {
            console.log('onTouchStart');
          }}
          onTouchEnd={() => {
            console.log('onTouchEnd');
            let startX = piece.x;
            let startY = piece.y;
            this.handleTouchEnd(index, kind, startX, startY, ratio);
          }}
          onDragStart={() => {
            this.audioPlaying(dragStartAudio);
            console.log('onDragStart');
            this.setState({
              showCardOptions: false
            });
          }}
          onDragEnd={() => {
            this.audioPlaying(dragEndAudio);
            console.log('onDragEnd');
          }}
        />
      );
    });

    let toolTipLayer = this.state.showCardOptions ? (
      <IconMenu
        iconButtonElement={
          <IconButton>
            <MoreVertIcon />
          </IconButton>
        }
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        targetOrigin={{ horizontal: 'left', vertical: 'top' }}
        className="my-tooltip"
        style={{
          left: this.state.tooltipPosition.x,
          top: this.state.tooltipPosition.y,
          position: 'absolute',
          display: 'initial',
          zIndex: 100,
          background: 'white',
          width: '40px',
          height: '40px'
        }}
      >
        <MenuItem
          style={{ padding: '0', listStyle: 'none', margin: '0' }}
          primaryText={'Options:'}
          disabled={true}
        />
        <MenuItem
          style={{ padding: '0', listStyle: 'none', margin: '0' }}
          primaryText={'Make Visible To Me'}
          onClick={() => {
            this.makeCardVisibleToSelf(this.state.selectedPieceIndex);
          }}
        />
        <MenuItem
          style={{ padding: '0', listStyle: 'none', margin: '0' }}
          primaryText={'Make Visible To Everyone'}
          onClick={() => {
            this.makeCardVisibleToAll(this.state.selectedPieceIndex);
          }}
        />
        <MenuItem
          style={{ padding: '0', listStyle: 'none', margin: '0' }}
          primaryText={'Hide From Everyone'}
          onClick={() => {
            this.makeCardHiddenToAll(this.state.selectedPieceIndex);
          }}
        />
        {this.state.selectedPieceIndex !== -1 &&
        this.isDeck(this.state.selectedPieceIndex) ? (
          <MenuItem
            style={{ padding: '0', listStyle: 'none', margin: '0' }}
            primaryText={'Shuffle Deck'}
            onClick={() => {
              this.shuffleDeck(
                this.props.gameSpec.pieces[this.state.selectedPieceIndex]
                  .deckPieceIndex
              );
            }}
          />
        ) : null}
      </IconMenu>
    ) : null;

    return (
      <div style={{ position: 'relative' }}>
        {toolTipLayer}
        <Stage width={width * ratio} height={height * ratio}>
          <Layer ref={() => 'boardLayer'}>{boardLayer}</Layer>
          <Layer ref={() => 'piecesLayer'}>{piecesLayer}</Layer>
        </Stage>
      </div>
    );
  }
}

const mapStateToProps = (state: StoreState) => {
  return {
    myUserId: state.myUser.myUserId,
    audioMute: state.audioMute
  };
};
export default connect(mapStateToProps)(Board);
