import React from 'react';
import {Spring, val} from '../../src/Spring';

const Demo = React.createClass({
  getInitialState() {
    return {open: false};
  },

  handleMouseDown() {
    this.setState({open: !this.state.open});
  },

  handleTouchStart(e) {
    e.preventDefault();
    this.handleMouseDown();
  },

  render() {
    return (
      <div>
        <button onMouseDown={this.handleMouseDown} onTouchStart={this.handleTouchStart}>
          Toggle
        </button>

        <div className="demo0">
          <Spring
            className="demo0-block"
            to={{
              // transform: {
              //   translate3d: [this.state.open ? 400 : 0, 0, 0],
              // },
              left: this.state.open ? 50 : 350,
              position: 'absolute',
            }}>asd</Spring>
          <Spring
            className="demo0-block"
            to={{
              left: val(this.state.open ? 400 : 0),
              position: 'absolute',
            }}>asd2</Spring>
        </div>
      </div>
    );
  },
});

export default Demo;
