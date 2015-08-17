import React, {PropTypes} from 'react';
import zero from './zero';
import stepper from './stepper';
import presets from './presets';

function mapObj(o, f) {
  return Object.keys(o).reduce((acc, key) => {
    acc[key] = f(o[key], key);
    return acc;
  }, {});
}

function map(coll, f) {
  if (Array.isArray(coll)) {
    return coll.map(f);
  }
  return Object.keys(coll).reduce((acc, key) => {
    acc[key] = f(coll[key], key);
    return acc;
  }, {});
}

function forEachObj(o, f) {
  Object.keys(o).forEach(key => f(o[key], key));
}

function forEach(coll, f) {
  if (Array.isArray(coll)) {
    return coll.forEach(f);
  }
  return Object.keys(coll).forEach(key => f(coll[key], key));
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
  transform(node, x) {
    if (typeof x !== 'object') {
      throw new Error('asdf');
    }

    let stringed = '';
    forEachObj(x, (arr, prop) => {
      // assume it's an array of 3 items (e.g. translate3d) for now
      stringed += `${prop}(${arr.join('px, ')}px)`;
    });

    node.style.transform = stringed;
    node.style.webkitTransform = stringed;
  },
};

const specialStep = {
  transform(dest, currValue, currVelocity) {
    if (typeof dest !== 'object') {
      throw new Error('asdf');
    }

    let nextCurrValue = {};
    let nextCurrVelocity = {};
    forEachObj(dest, (arr, prop) => {
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
    });

    return [nextCurrValue, nextCurrVelocity];
  },
};

const specialInitVelocity = {
  transform(value) {
    return mapObj(value, _value => {
      // assumes _value already a stripped value. But either case, this maps
      // anything to 0 anyway
      return _value.map(zero);
    });
  },
};

const specialStrip = {
  transform(value) {
    return mapObj(value, _value => {
      return _value.map(o => {
        if (o._isConfig) {
          return o.val;
        }
        return o;
      });
    });
  },
};

function stripWrappers(to) {
  return mapObj(to, (value, key) => {
    if (specialProps[key]) {
      return specialStrip[key](value);
    }
    return value._isConfig ? value.val : value;
  });
}

export function val(x, k = presets.noWobble[0], b = presets.noWobble[1]) {
  const _x = x._isConfig ? x.val : x;
  // ^ might already a config, happens when you use dependent spring and call
  // val() on a certain other config

  return {
    val: _x,
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
  },

  _rafId: null,

  curr: null,
  node: null,

  componentWillMount() {
    const {to} = this.props;
    const currValues = stripWrappers(to);
    const currVelocities = mapObj(currValues, (value, key) => {
      if (specialProps[key]) {
        return specialInitVelocity[key](value);
      }
      return 0;
    });
    this.curr = {currValues, currVelocities};
  },

  componentDidMount() {
    this.node = React.findDOMNode(this.refs.comp);
    this.startRaf();
  },

  componentWillUnmount() {
    window.cancelAnimationFrame(this._rafId);
    this._rafId = null;
  },

  step(to) {
    const {currValues, currVelocities} = this.curr;
    const node = this.node;
    forEachObj(to, (dest, key) => {
      if (!methods[key]) {
        node.style[key] = dest;
        return;
      }

      let nextCurrValue;
      let nextCurrVelocity;

      const currValue = currValues[key];
      const currVelocity = currVelocities[key];

      if (specialProps[key]) {
        [nextCurrValue, nextCurrVelocity] = specialStep[key](
          dest, currValue, currVelocity
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
      }
      methods[key](node, nextCurrValue);

      this.curr.currValues[key] = nextCurrValue;
      this.curr.currVelocities[key] = nextCurrVelocity;
    });
  },

  startRaf() {
    this._rafId = requestAnimationFrame(() => {
      this.step(this.props.to);
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

export const Wrap = React.createClass({
  childContextTypes: {
    tos: PropTypes.shape({
      currValues: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.array,
      ]).isRequired,
      currVelocities: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.array,
      ]).isRequired,
    }).isRequired,
  },

  getChildContext() {
    return {
      tos: this.curr,
    };
  },

  propTypes: {
    tos: PropTypes.func.isRequired,
  },

  curr: null,
  _rafId: null,

  componentWillMount() {
    this.curr = {};
    const init = this.props.tos();

    let asd = _currValues => mapObj(_currValues, (value, key) => {
      if (specialProps[key]) {
        return specialInitVelocity[key](value);
      }
      return 0;
    });

    const currValues = map(init, stripWrappers);
    const currVelocities = map(currValues, asd);

    this.curr = {currValues, currVelocities};
  },

  step(tos) {
    const {currValues, currVelocities} = this.curr;

    forEach(tos, (to, idxKey) => {
      forEachObj(to, (dest, key) => {
        let nextCurrValue;
        let nextCurrVelocity;

        const currValue = currValues[idxKey][key];
        const currVelocity = currVelocities[idxKey][key];

        if (specialProps[key]) {
          [nextCurrValue, nextCurrVelocity] = specialStep[key](
            dest, currValue, currVelocity
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
        }

        this.curr.currValues[idxKey][key] = nextCurrValue;
        this.curr.currVelocities[idxKey][key] = nextCurrVelocity;
      });
    });
  },

  startRaf() {
    this._rafId = requestAnimationFrame(() => {
      this.step(this.props.tos(this.curr.currValues));
      this.startRaf();
    });
  },

  componentDidMount() {
    this.startRaf();
  },

  componentWillUnmount() {
    window.cancelAnimationFrame(this._rafId);
    this._rafId = null;
  },

  render() {
    const {children} = this.props;
    return (
      <div>{children}</div>
    );
  },
});

export const S = React.createClass({
  contextTypes: {
    tos: PropTypes.shape({
      currValues: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.array,
      ]).isRequired,
    }).isRequired,
  },

  propTypes: {
    to: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  },

  _rafId: null,
  node: null,

  componentDidMount() {
    this.node = React.findDOMNode(this.refs.comp);
    this.startRaf();
  },

  componentWillUnmount() {
    window.cancelAnimationFrame(this._rafId);
    this._rafId = null;
  },

  step(currValue) {
    const node = this.node;
    forEachObj(currValue, (v, key) => {
      methods[key](node, v);
    });
  },

  startRaf() {
    this._rafId = requestAnimationFrame(() => {
      this.step(this.context.tos.currValues[this.props.to]);
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

