import React from 'react';
import {Child, Springs, val, stop} from '../../src/Spring';
import range from 'lodash.range';

const Demo = React.createClass({
  getInitialState() {
    return {mouse: [250, 300]};
  },

  componentDidMount() {
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchmove', this.handleTouchMove);
  },

  handleMouseMove({pageX, pageY}) {
    this.setState({mouse: [pageX, pageY]});
  },

  handleTouchMove({touches}) {
    this.handleMouseMove(touches[0]);
  },

  getEndValue(prevValue) {
    const [mouseX, mouseY] = this.state.mouse;

    if (prevValue == null) {
      return range(6).map(() => ({transform: {translate3d: [0, 0, 0]}}));
    }
    // `prevValue` is the interpolated value of the last tick
    const endValue = prevValue.map((_, i) => {
      return i === 0
        ? {transform: {translate3d: [stop(mouseX), stop(mouseY), 0]}}
        : {transform: {translate3d:
            prevValue[i - 1].transform.translate3d.map(v => val(v, 120, 14)),
          }};
    });
    return endValue;
  },

  render() {
    return (
      <Springs tos={this.getEndValue}>
        {range(6).map(i =>
          <Child
            key={i}
            className={`demo1-ball ball-${i % 6}`}
            to={i}
            style={{zIndex: 6 - i}} />
        )}
      </Springs>
    );
  },
});

export default Demo;
