import React from 'react';
import {StaggeredMotion, spring} from '../../src/react-motion';
import range from 'lodash.range';
import presets from '../../src/presets';

const Demo = React.createClass({
  getInitialState() {
    return {count: 2, x: 250, y: 300};
  },

  componentDidMount() {
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchmove', this.handleTouchMove);
  },

  handleKeyUp(e) {
    if (e.keyCode === 13) {
      this.setState({count: this.state.count + 1});
    }
  },

  handleMouseMove({pageX: x, pageY: y}) {
    this.setState({x, y});
  },

  handleTouchMove({touches}) {
    this.handleMouseMove(touches[0]);
  },

  getStyles(prevStyles) {
    // `prevStyles` is the interpolated value of the last tick
    const endValue = prevStyles.map((_, i) => {
      return i === 0
        ? this.state
        : {
            x: spring(prevStyles[i - 1].x, presets.gentle),
            y: spring(prevStyles[i - 1].y, presets.gentle),
          };
    });

    // Append new item
    return endValue.length !== this.state.count ? endValue.concat([{x: 0, y: 0}]) : endValue;
  },

  render() {
    return (
      <StaggeredMotion
        defaultStyles={range(this.state.count).map(() => ({x: 0, y: 0}))}
        styles={this.getStyles}>
        {balls =>
          <div className="demo1">
            {balls.map(({x, y}, i) =>
              <div
                key={i}
                className={`demo1-ball ball-${i % 6}`}
                style={{
                  WebkitTransform: `translate3d(${x - 25}px, ${y - 25}px, 0)`,
                  transform: `translate3d(${x - 25}px, ${y - 25}px, 0)`,
                  zIndex: balls.length - i,
                }} />
            )}
          </div>
        }
      </StaggeredMotion>
    );
  },
});

export default Demo;
