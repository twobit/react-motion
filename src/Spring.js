import React, {PropTypes} from 'react';
import zero from './zero';
import stepper from './stepper';
import presets from './presets';

function mapObj(o, f) {
  return Object.keys(o).reduce((acc, key) => {
    acc[key] = f(key, o[key]);
    return acc;
  }, {});
}

function forEachObj(o, f) {
  Object.keys(o).forEach(key => f(key, o[key]));
}

const methods = {
  top(node, x) {
    node.style.top = x + 'px';
  },
  left(node, x) {
    node.style.left = x + 'px';
  },
  height(node, x) {
    node.style.height = x + 'px';
  },
  width(node, x) {
    node.style.width = x + 'px';
  },
};

function stripWrappers(to) {
  return mapObj(to, (_, x) => x._isConfig ? x.val : x);
}

export function val(x, k = presets.noWobble[0], b = presets.noWobble[1]) {
  return {
    val: x,
    k,
    b,
    _isConfig: true,
    // _currVelocity: ...,
    // _currValue: ...,
  };
}

export const Spring = React.createClass({
  propTypes: {
    to: PropTypes.object.isRequired,
    children: PropTypes.any,
    className: PropTypes.string,
  },

  _rafId: null,
  currValues: null,
  currVelocities: null,

  componentDidMount() {
    const {to} = this.props;
    this.currValues = stripWrappers(to);
    this.currVelocities = mapObj(this.currValues, zero);
    this.startRaf();
  },

  componentWillUnmount() {
    window.cancelAnimationFrame(this._rafId);
    this._rafId = null;
  },

  startRaf() {
    this._rafId = requestAnimationFrame(() => {
      const {to} = this.props;
      const {currValues, currVelocities} = this;
      const node = React.findDOMNode(this.refs.comp);
      forEachObj(to, (key, dest) => {
        if (!methods[key]) {
          node.style[key] = dest;
          return;
        }
        const _dest = dest._isConfig ? dest : val(dest);

        const currValue = currValues[key];
        const currVelocity = currVelocities[key];

        const [nextCurrValue, nextCurrVelocity] = stepper(
          1 / 60,
          currValue,
          currVelocity,
          _dest.val,
          _dest.k,
          _dest.b,
        );
        methods[key](node, nextCurrValue);

        this.currValues[key] = nextCurrValue;
        this.currVelocities[key] = nextCurrVelocity;
      });
      this.startRaf();
    });
  },

  render() {
    const {className, children} = this.props;
    return (
      <div ref="comp" className={className}>{children}</div>
    );
  },
});
