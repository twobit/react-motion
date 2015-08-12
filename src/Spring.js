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
        if (_dest._stop) {
          [nextCurrValue[prop][i], nextCurrVelocity[prop][i]] = [_dest.val, 0];
        } else {
          [nextCurrValue[prop][i], nextCurrVelocity[prop][i]] = stepper(
            1 / 60,
            currValue[prop][i],
            currVelocity[prop][i],
            _dest.val,
            _dest.k,
            _dest.b,
          );
        }
      }
      stringed += `${prop}(${nextCurrValue[prop].join('px, ')}px)`;
    });

    node.style.transform = stringed;
    node.style.webkitTransform = stringed;
    return [nextCurrValue, nextCurrVelocity];
  },
};

const specialInitVelocity = {
  transform(value) {
    return mapObj(value, (key, value2) => {
      // assumes value2 already a stripped value. But either case, this maps
      // anything to 0 anyway
      return value2.map(zero);
    });
  },
};

const specialStrip = {
  transform(value) {
    return mapObj(value, (key, value2) => {
      return value2.map(o => {
        if (o._isConfig) {
          return o.val;
        }
        return o;
      });
    });
  },
};

function stripWrappers(to) {
  return mapObj(to, (key, value) => {
    if (specialProps[key]) {
      return specialStrip[key](value);
    }
    return value._isConfig ? value.val : value;
  });
}

export function val(x, k = presets.noWobble[0], b = presets.noWobble[1]) {
  return {
    val: x,
    k,
    b,
    _isConfig: true,
  };
}

export function stop(x) {
  return {
    val: x,
    _stop: true,
    _isConfig: true,
  };
}

export const Spring = React.createClass({
  propTypes: {
    to: PropTypes.object.isRequired,
    children: PropTypes.any,
    className: PropTypes.string,
  },

  _rafId: null,

  curr: null,

  componentDidMount() {
    const {to} = this.props;
    this.curr = {};
    this.curr.currValues = stripWrappers(to);
    this.curr.currVelocities = mapObj(this.curr.currValues, (key, value) => {
      if (specialProps[key]) {
        return specialInitVelocity[key](value);
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
      const {currValues, currVelocities} = this.curr;
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

          if (_dest._stop) {
            [nextCurrValue, nextCurrVelocity] = [_dest.val, 0];
          } else {
            [nextCurrValue, nextCurrVelocity] = stepper(
              1 / 60,
              currValue,
              currVelocity,
              _dest.val,
              _dest.k,
              _dest.b,
            );
          }

          methods[key](node, nextCurrValue);
        }

        this.curr.currValues[key] = nextCurrValue;
        this.curr.currVelocities[key] = nextCurrVelocity;
      });
      this.startRaf();
    });
  },

  render() {
    const {to, onMouseDown, onTouchStart, ...rest} = this.props;
    return (
      <div
        ref="comp"
        onMouseDown={(...args) => onMouseDown && onMouseDown(...args, this.curr)}
        onTouchStart={(...args) => onTouchStart && onTouchStart(...args, this.curr)}
        {...rest} />
    );
  },
});
