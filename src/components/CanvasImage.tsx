import { Image, KonvaNodeProps } from 'react-konva';
import * as React from 'react';
import * as Konva from 'konva';

// global Window class doesn't come with Image()
// so we have to add it ourselves
declare global {
  interface Window {
    Image: {
      prototype: HTMLImageElement;
      new (): HTMLImageElement;
    };
  }
}

// try drag& drop rectangle
interface CanvasImageProps extends KonvaNodeProps {
  src: string;
  width: number;
  height: number;
  onClick?: (e: React.MouseEvent<{}>) => void;
  x?: number;
  y?: number;
  rotation?: number;
  draggable?: boolean;
  onDragEnd?: (e: React.SyntheticEvent<{}>) => void;
  item?: any;
}

interface CanvasImageState {
  image: any;
}

class CanvasImage extends React.Component<CanvasImageProps, CanvasImageState> {
  imageNode: Konva.Image;

  constructor(props: CanvasImageProps) {
    super(props);
    this.state = {
      image: null
    };
  }

  componentDidMount() {
    this.setImage();
    // this.refs['image'].cache();
    // this.refs['image'].drawHitFromCache();
  }

  componentWillReceiveProps(nextProps: CanvasImageProps) {
    const image = new window.Image();
    image.crossOrigin = 'Anonymous';
    image.src = nextProps.src;
    image.onload = () => {
      this.setState({
        image: image
      });
      this.imageNode.cache();
      this.imageNode.drawHitFromCache(0);
    };
  }

  setImage = () => {
    const image = new window.Image();
    image.src = this.props.src;
    image.crossOrigin = 'Anonymous';
    image.onload = () => {
      this.setState({
        image: image
      });
      this.imageNode.cache();
      this.imageNode.drawHitFromCache(0);
    };
  };

  render() {
    return (
      <Image
        ref={(node: any) => {
          if (node !== null) {
            this.imageNode = node;
          }
          return 'image';
        }}
        {...this.props}
        image={this.state.image}
      />
    );
  }
}

export default CanvasImage;
