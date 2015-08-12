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

const specialProps = {
  transform: true,
};

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
  transform(node, dest, currValue, currVelocity) {
    if (typeof dest !== 'object') {
      throw new Error('asdf');
    }

    let nextCurrValue = {};
    let nextCurrVelocity = {};
    let stringed = '';
    forEachObj(dest, (prop, arr) => {
      // assume it's an array of 3 items (e.g. translate3d) for now
      nextCurrValue[prop] = [];
      nextCurrVelocity[prop] = [];
      for (let i = 0; i < 3; i++) {
        const _dest = arr[i]._isConfig ? arr[i] : val(arr[i]);
        [nextCurrValue[prop][i], nextCurrVelocity[prop][i]] = stepper(
          1 / 60,
          currValue[prop][i],
          currVelocity[prop][i],
          _dest.val,
          _dest.k,
          _dest.b,
        );
      }
      stringed += `${prop}(${nextCurrValue[prop].join('px, ')}px)`;
    });

    node.style.transform = stringed;
    node.style.webkitTransform = stringed;
    return [nextCurrValue, nextCurrVelocity];
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

const specialInit = {
  transform(value) {
    return mapObj(value, (key, value2) => {
      return value2.map(zero);
    });
  },
};

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
    this.currVelocities = mapObj(this.currValues, (key, value) => {
      if (specialProps[key]) {
        return specialInit[key](value);
      }
      return 0;
    });
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

        let nextCurrValue;
        let nextCurrVelocity;

        const currValue = currValues[key];
        const currVelocity = currVelocities[key];

        if (specialProps[key]) {
          [nextCurrValue, nextCurrVelocity] = methods[key](
            node, dest, currValue, currVelocity
          );
        } else {
          const _dest = dest._isConfig ? dest : val(dest);

          [nextCurrValue, nextCurrVelocity] = stepper(
            1 / 60,
            currValue,
            currVelocity,
            _dest.val,
            _dest.k,
            _dest.b,
          );
          methods[key](node, nextCurrValue);
        }

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
