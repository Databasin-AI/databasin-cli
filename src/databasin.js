#!/usr/bin/env bun
// @bun
var L1 = Object.create;
var { getPrototypeOf: V1, defineProperty: WF, getOwnPropertyNames: N1 } = Object;
var T1 = Object.prototype.hasOwnProperty;
var aD = (D, u, F) => {
	F = D != null ? L1(V1(D)) : {};
	let E = u || !D || !D.__esModule ? WF(F, 'default', { value: D, enumerable: !0 }) : F;
	for (let B of N1(D)) if (!T1.call(E, B)) WF(E, B, { get: () => D[B], enumerable: !0 });
	return E;
};
var G = (D, u) => () => (u || D((u = { exports: {} }).exports, u), u.exports);
var uD = import.meta.require;
var iD = G((I1) => {
	class o0 extends Error {
		constructor(D, u, F) {
			super(F);
			(Error.captureStackTrace(this, this.constructor),
				(this.name = this.constructor.name),
				(this.code = u),
				(this.exitCode = D),
				(this.nestedError = void 0));
		}
	}
	class RF extends o0 {
		constructor(D) {
			super(1, 'commander.invalidArgument', D);
			(Error.captureStackTrace(this, this.constructor), (this.name = this.constructor.name));
		}
	}
	I1.CommanderError = o0;
	I1.InvalidArgumentError = RF;
});
var G0 = G((w1) => {
	var { InvalidArgumentError: P1 } = iD();
	class qF {
		constructor(D, u) {
			switch (
				((this.description = u || ''),
				(this.variadic = !1),
				(this.parseArg = void 0),
				(this.defaultValue = void 0),
				(this.defaultValueDescription = void 0),
				(this.argChoices = void 0),
				D[0])
			) {
				case '<':
					((this.required = !0), (this._name = D.slice(1, -1)));
					break;
				case '[':
					((this.required = !1), (this._name = D.slice(1, -1)));
					break;
				default:
					((this.required = !0), (this._name = D));
					break;
			}
			if (this._name.length > 3 && this._name.slice(-3) === '...')
				((this.variadic = !0), (this._name = this._name.slice(0, -3)));
		}
		name() {
			return this._name;
		}
		_concatValue(D, u) {
			if (u === this.defaultValue || !Array.isArray(u)) return [D];
			return u.concat(D);
		}
		default(D, u) {
			return ((this.defaultValue = D), (this.defaultValueDescription = u), this);
		}
		argParser(D) {
			return ((this.parseArg = D), this);
		}
		choices(D) {
			return (
				(this.argChoices = D.slice()),
				(this.parseArg = (u, F) => {
					if (!this.argChoices.includes(u))
						throw new P1(`Allowed choices are ${this.argChoices.join(', ')}.`);
					if (this.variadic) return this._concatValue(u, F);
					return u;
				}),
				this
			);
		}
		argRequired() {
			return ((this.required = !0), this);
		}
		argOptional() {
			return ((this.required = !1), this);
		}
	}
	function S1(D) {
		let u = D.name() + (D.variadic === !0 ? '...' : '');
		return D.required ? '<' + u + '>' : '[' + u + ']';
	}
	w1.Argument = qF;
	w1.humanReadableArgName = S1;
});
var e0 = G((v1) => {
	var { humanReadableArgName: x1 } = G0();
	class LF {
		constructor() {
			((this.helpWidth = void 0),
				(this.sortSubcommands = !1),
				(this.sortOptions = !1),
				(this.showGlobalOptions = !1));
		}
		visibleCommands(D) {
			let u = D.commands.filter((E) => !E._hidden),
				F = D._getHelpCommand();
			if (F && !F._hidden) u.push(F);
			if (this.sortSubcommands)
				u.sort((E, B) => {
					return E.name().localeCompare(B.name());
				});
			return u;
		}
		compareOptions(D, u) {
			let F = (E) => {
				return E.short ? E.short.replace(/^-/, '') : E.long.replace(/^--/, '');
			};
			return F(D).localeCompare(F(u));
		}
		visibleOptions(D) {
			let u = D.options.filter((E) => !E.hidden),
				F = D._getHelpOption();
			if (F && !F.hidden) {
				let E = F.short && D._findOption(F.short),
					B = F.long && D._findOption(F.long);
				if (!E && !B) u.push(F);
				else if (F.long && !B) u.push(D.createOption(F.long, F.description));
				else if (F.short && !E) u.push(D.createOption(F.short, F.description));
			}
			if (this.sortOptions) u.sort(this.compareOptions);
			return u;
		}
		visibleGlobalOptions(D) {
			if (!this.showGlobalOptions) return [];
			let u = [];
			for (let F = D.parent; F; F = F.parent) {
				let E = F.options.filter((B) => !B.hidden);
				u.push(...E);
			}
			if (this.sortOptions) u.sort(this.compareOptions);
			return u;
		}
		visibleArguments(D) {
			if (D._argsDescription)
				D.registeredArguments.forEach((u) => {
					u.description = u.description || D._argsDescription[u.name()] || '';
				});
			if (D.registeredArguments.find((u) => u.description)) return D.registeredArguments;
			return [];
		}
		subcommandTerm(D) {
			let u = D.registeredArguments.map((F) => x1(F)).join(' ');
			return (
				D._name +
				(D._aliases[0] ? '|' + D._aliases[0] : '') +
				(D.options.length ? ' [options]' : '') +
				(u ? ' ' + u : '')
			);
		}
		optionTerm(D) {
			return D.flags;
		}
		argumentTerm(D) {
			return D.name();
		}
		longestSubcommandTermLength(D, u) {
			return u.visibleCommands(D).reduce((F, E) => {
				return Math.max(F, u.subcommandTerm(E).length);
			}, 0);
		}
		longestOptionTermLength(D, u) {
			return u.visibleOptions(D).reduce((F, E) => {
				return Math.max(F, u.optionTerm(E).length);
			}, 0);
		}
		longestGlobalOptionTermLength(D, u) {
			return u.visibleGlobalOptions(D).reduce((F, E) => {
				return Math.max(F, u.optionTerm(E).length);
			}, 0);
		}
		longestArgumentTermLength(D, u) {
			return u.visibleArguments(D).reduce((F, E) => {
				return Math.max(F, u.argumentTerm(E).length);
			}, 0);
		}
		commandUsage(D) {
			let u = D._name;
			if (D._aliases[0]) u = u + '|' + D._aliases[0];
			let F = '';
			for (let E = D.parent; E; E = E.parent) F = E.name() + ' ' + F;
			return F + u + ' ' + D.usage();
		}
		commandDescription(D) {
			return D.description();
		}
		subcommandDescription(D) {
			return D.summary() || D.description();
		}
		optionDescription(D) {
			let u = [];
			if (D.argChoices) u.push(`choices: ${D.argChoices.map((F) => JSON.stringify(F)).join(', ')}`);
			if (D.defaultValue !== void 0) {
				if (D.required || D.optional || (D.isBoolean() && typeof D.defaultValue === 'boolean'))
					u.push(`default: ${D.defaultValueDescription || JSON.stringify(D.defaultValue)}`);
			}
			if (D.presetArg !== void 0 && D.optional) u.push(`preset: ${JSON.stringify(D.presetArg)}`);
			if (D.envVar !== void 0) u.push(`env: ${D.envVar}`);
			if (u.length > 0) return `${D.description} (${u.join(', ')})`;
			return D.description;
		}
		argumentDescription(D) {
			let u = [];
			if (D.argChoices) u.push(`choices: ${D.argChoices.map((F) => JSON.stringify(F)).join(', ')}`);
			if (D.defaultValue !== void 0)
				u.push(`default: ${D.defaultValueDescription || JSON.stringify(D.defaultValue)}`);
			if (u.length > 0) {
				let F = `(${u.join(', ')})`;
				if (D.description) return `${D.description} ${F}`;
				return F;
			}
			return D.description;
		}
		formatHelp(D, u) {
			let F = u.padWidth(D, u),
				E = u.helpWidth || 80,
				B = 2,
				C = 2;
			function A(Y, H) {
				if (H) {
					let K = `${Y.padEnd(F + 2)}${H}`;
					return u.wrap(K, E - 2, F + 2);
				}
				return Y;
			}
			function _(Y) {
				return Y.join(
					`
`
				).replace(/^/gm, ' '.repeat(2));
			}
			let $ = [`Usage: ${u.commandUsage(D)}`, ''],
				Z = u.commandDescription(D);
			if (Z.length > 0) $ = $.concat([u.wrap(Z, E, 0), '']);
			let z = u.visibleArguments(D).map((Y) => {
				return A(u.argumentTerm(Y), u.argumentDescription(Y));
			});
			if (z.length > 0) $ = $.concat(['Arguments:', _(z), '']);
			let J = u.visibleOptions(D).map((Y) => {
				return A(u.optionTerm(Y), u.optionDescription(Y));
			});
			if (J.length > 0) $ = $.concat(['Options:', _(J), '']);
			if (this.showGlobalOptions) {
				let Y = u.visibleGlobalOptions(D).map((H) => {
					return A(u.optionTerm(H), u.optionDescription(H));
				});
				if (Y.length > 0) $ = $.concat(['Global Options:', _(Y), '']);
			}
			let Q = u.visibleCommands(D).map((Y) => {
				return A(u.subcommandTerm(Y), u.subcommandDescription(Y));
			});
			if (Q.length > 0) $ = $.concat(['Commands:', _(Q), '']);
			return $.join(`
`);
		}
		padWidth(D, u) {
			return Math.max(
				u.longestOptionTermLength(D, u),
				u.longestGlobalOptionTermLength(D, u),
				u.longestSubcommandTermLength(D, u),
				u.longestArgumentTermLength(D, u)
			);
		}
		wrap(D, u, F, E = 40) {
			let C = new RegExp(`[\\n][${' \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF'}]+`);
			if (D.match(C)) return D;
			let A = u - F;
			if (A < E) return D;
			let _ = D.slice(0, F),
				$ = D.slice(F).replace(
					`\r
`,
					`
`
				),
				Z = ' '.repeat(F),
				J = `\\s${'\u200B'}`,
				Q = new RegExp(
					`
|.{1,${A - 1}}([${J}]|$)|[^${J}]+?([${J}]|$)`,
					'g'
				),
				Y = $.match(Q) || [];
			return (
				_ +
				Y.map((H, K) => {
					if (
						H ===
						`
`
					)
						return '';
					return (K > 0 ? Z : '') + H.trimEnd();
				}).join(`
`)
			);
		}
	}
	v1.Help = LF;
});
var Du = G((m1) => {
	var { InvalidArgumentError: h1 } = iD();
	class VF {
		constructor(D, u) {
			((this.flags = D),
				(this.description = u || ''),
				(this.required = D.includes('<')),
				(this.optional = D.includes('[')),
				(this.variadic = /\w\.\.\.[>\]]$/.test(D)),
				(this.mandatory = !1));
			let F = g1(D);
			if (((this.short = F.shortFlag), (this.long = F.longFlag), (this.negate = !1), this.long))
				this.negate = this.long.startsWith('--no-');
			((this.defaultValue = void 0),
				(this.defaultValueDescription = void 0),
				(this.presetArg = void 0),
				(this.envVar = void 0),
				(this.parseArg = void 0),
				(this.hidden = !1),
				(this.argChoices = void 0),
				(this.conflictsWith = []),
				(this.implied = void 0));
		}
		default(D, u) {
			return ((this.defaultValue = D), (this.defaultValueDescription = u), this);
		}
		preset(D) {
			return ((this.presetArg = D), this);
		}
		conflicts(D) {
			return ((this.conflictsWith = this.conflictsWith.concat(D)), this);
		}
		implies(D) {
			let u = D;
			if (typeof D === 'string') u = { [D]: !0 };
			return ((this.implied = Object.assign(this.implied || {}, u)), this);
		}
		env(D) {
			return ((this.envVar = D), this);
		}
		argParser(D) {
			return ((this.parseArg = D), this);
		}
		makeOptionMandatory(D = !0) {
			return ((this.mandatory = !!D), this);
		}
		hideHelp(D = !0) {
			return ((this.hidden = !!D), this);
		}
		_concatValue(D, u) {
			if (u === this.defaultValue || !Array.isArray(u)) return [D];
			return u.concat(D);
		}
		choices(D) {
			return (
				(this.argChoices = D.slice()),
				(this.parseArg = (u, F) => {
					if (!this.argChoices.includes(u))
						throw new h1(`Allowed choices are ${this.argChoices.join(', ')}.`);
					if (this.variadic) return this._concatValue(u, F);
					return u;
				}),
				this
			);
		}
		name() {
			if (this.long) return this.long.replace(/^--/, '');
			return this.short.replace(/^-/, '');
		}
		attributeName() {
			return f1(this.name().replace(/^no-/, ''));
		}
		is(D) {
			return this.short === D || this.long === D;
		}
		isBoolean() {
			return !this.required && !this.optional && !this.negate;
		}
	}
	class NF {
		constructor(D) {
			((this.positiveOptions = new Map()),
				(this.negativeOptions = new Map()),
				(this.dualOptions = new Set()),
				D.forEach((u) => {
					if (u.negate) this.negativeOptions.set(u.attributeName(), u);
					else this.positiveOptions.set(u.attributeName(), u);
				}),
				this.negativeOptions.forEach((u, F) => {
					if (this.positiveOptions.has(F)) this.dualOptions.add(F);
				}));
		}
		valueFromOption(D, u) {
			let F = u.attributeName();
			if (!this.dualOptions.has(F)) return !0;
			let E = this.negativeOptions.get(F).presetArg,
				B = E !== void 0 ? E : !1;
			return u.negate === (B === D);
		}
	}
	function f1(D) {
		return D.split('-').reduce((u, F) => {
			return u + F[0].toUpperCase() + F.slice(1);
		});
	}
	function g1(D) {
		let u,
			F,
			E = D.split(/[ |,]+/);
		if (E.length > 1 && !/^[[<]/.test(E[1])) u = E.shift();
		if (((F = E.shift()), !u && /^-[^-]$/.test(F))) ((u = F), (F = void 0));
		return { shortFlag: u, longFlag: F };
	}
	m1.Option = VF;
	m1.DualOptions = NF;
});
var TF = G((a1) => {
	function l1(D, u) {
		if (Math.abs(D.length - u.length) > 3) return Math.max(D.length, u.length);
		let F = [];
		for (let E = 0; E <= D.length; E++) F[E] = [E];
		for (let E = 0; E <= u.length; E++) F[0][E] = E;
		for (let E = 1; E <= u.length; E++)
			for (let B = 1; B <= D.length; B++) {
				let C = 1;
				if (D[B - 1] === u[E - 1]) C = 0;
				else C = 1;
				if (
					((F[B][E] = Math.min(F[B - 1][E] + 1, F[B][E - 1] + 1, F[B - 1][E - 1] + C)),
					B > 1 && E > 1 && D[B - 1] === u[E - 2] && D[B - 2] === u[E - 1])
				)
					F[B][E] = Math.min(F[B][E], F[B - 2][E - 2] + 1);
			}
		return F[D.length][u.length];
	}
	function p1(D, u) {
		if (!u || u.length === 0) return '';
		u = Array.from(new Set(u));
		let F = D.startsWith('--');
		if (F) ((D = D.slice(2)), (u = u.map((A) => A.slice(2))));
		let E = [],
			B = 3,
			C = 0.4;
		if (
			(u.forEach((A) => {
				if (A.length <= 1) return;
				let _ = l1(D, A),
					$ = Math.max(D.length, A.length);
				if (($ - _) / $ > C) {
					if (_ < B) ((B = _), (E = [A]));
					else if (_ === B) E.push(A);
				}
			}),
			E.sort((A, _) => A.localeCompare(_)),
			F)
		)
			E = E.map((A) => `--${A}`);
		if (E.length > 1)
			return `
(Did you mean one of ${E.join(', ')}?)`;
		if (E.length === 1)
			return `
(Did you mean ${E[0]}?)`;
		return '';
	}
	a1.suggestSimilar = p1;
});
var PF = G((e1) => {
	var n1 = uD('events').EventEmitter,
		uu = uD('child_process'),
		JD = uD('path'),
		Fu = uD('fs'),
		b = uD('process'),
		{ Argument: s1, humanReadableArgName: r1 } = G0(),
		{ CommanderError: Eu } = iD(),
		{ Help: t1 } = e0(),
		{ Option: IF, DualOptions: o1 } = Du(),
		{ suggestSimilar: jF } = TF();
	class Bu extends n1 {
		constructor(D) {
			super();
			((this.commands = []),
				(this.options = []),
				(this.parent = null),
				(this._allowUnknownOption = !1),
				(this._allowExcessArguments = !0),
				(this.registeredArguments = []),
				(this._args = this.registeredArguments),
				(this.args = []),
				(this.rawArgs = []),
				(this.processedArgs = []),
				(this._scriptPath = null),
				(this._name = D || ''),
				(this._optionValues = {}),
				(this._optionValueSources = {}),
				(this._storeOptionsAsProperties = !1),
				(this._actionHandler = null),
				(this._executableHandler = !1),
				(this._executableFile = null),
				(this._executableDir = null),
				(this._defaultCommandName = null),
				(this._exitCallback = null),
				(this._aliases = []),
				(this._combineFlagAndOptionalValue = !0),
				(this._description = ''),
				(this._summary = ''),
				(this._argsDescription = void 0),
				(this._enablePositionalOptions = !1),
				(this._passThroughOptions = !1),
				(this._lifeCycleHooks = {}),
				(this._showHelpAfterError = !1),
				(this._showSuggestionAfterError = !0),
				(this._outputConfiguration = {
					writeOut: (u) => b.stdout.write(u),
					writeErr: (u) => b.stderr.write(u),
					getOutHelpWidth: () => (b.stdout.isTTY ? b.stdout.columns : void 0),
					getErrHelpWidth: () => (b.stderr.isTTY ? b.stderr.columns : void 0),
					outputError: (u, F) => F(u)
				}),
				(this._hidden = !1),
				(this._helpOption = void 0),
				(this._addImplicitHelpCommand = void 0),
				(this._helpCommand = void 0),
				(this._helpConfiguration = {}));
		}
		copyInheritedSettings(D) {
			return (
				(this._outputConfiguration = D._outputConfiguration),
				(this._helpOption = D._helpOption),
				(this._helpCommand = D._helpCommand),
				(this._helpConfiguration = D._helpConfiguration),
				(this._exitCallback = D._exitCallback),
				(this._storeOptionsAsProperties = D._storeOptionsAsProperties),
				(this._combineFlagAndOptionalValue = D._combineFlagAndOptionalValue),
				(this._allowExcessArguments = D._allowExcessArguments),
				(this._enablePositionalOptions = D._enablePositionalOptions),
				(this._showHelpAfterError = D._showHelpAfterError),
				(this._showSuggestionAfterError = D._showSuggestionAfterError),
				this
			);
		}
		_getCommandAndAncestors() {
			let D = [];
			for (let u = this; u; u = u.parent) D.push(u);
			return D;
		}
		command(D, u, F) {
			let E = u,
				B = F;
			if (typeof E === 'object' && E !== null) ((B = E), (E = null));
			B = B || {};
			let [, C, A] = D.match(/([^ ]+) *(.*)/),
				_ = this.createCommand(C);
			if (E) (_.description(E), (_._executableHandler = !0));
			if (B.isDefault) this._defaultCommandName = _._name;
			if (
				((_._hidden = !!(B.noHelp || B.hidden)), (_._executableFile = B.executableFile || null), A)
			)
				_.arguments(A);
			if ((this._registerCommand(_), (_.parent = this), _.copyInheritedSettings(this), E))
				return this;
			return _;
		}
		createCommand(D) {
			return new Bu(D);
		}
		createHelp() {
			return Object.assign(new t1(), this.configureHelp());
		}
		configureHelp(D) {
			if (D === void 0) return this._helpConfiguration;
			return ((this._helpConfiguration = D), this);
		}
		configureOutput(D) {
			if (D === void 0) return this._outputConfiguration;
			return (Object.assign(this._outputConfiguration, D), this);
		}
		showHelpAfterError(D = !0) {
			if (typeof D !== 'string') D = !!D;
			return ((this._showHelpAfterError = D), this);
		}
		showSuggestionAfterError(D = !0) {
			return ((this._showSuggestionAfterError = !!D), this);
		}
		addCommand(D, u) {
			if (!D._name)
				throw Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
			if (((u = u || {}), u.isDefault)) this._defaultCommandName = D._name;
			if (u.noHelp || u.hidden) D._hidden = !0;
			return (this._registerCommand(D), (D.parent = this), D._checkForBrokenPassThrough(), this);
		}
		createArgument(D, u) {
			return new s1(D, u);
		}
		argument(D, u, F, E) {
			let B = this.createArgument(D, u);
			if (typeof F === 'function') B.default(E).argParser(F);
			else B.default(F);
			return (this.addArgument(B), this);
		}
		arguments(D) {
			return (
				D.trim()
					.split(/ +/)
					.forEach((u) => {
						this.argument(u);
					}),
				this
			);
		}
		addArgument(D) {
			let u = this.registeredArguments.slice(-1)[0];
			if (u && u.variadic) throw Error(`only the last argument can be variadic '${u.name()}'`);
			if (D.required && D.defaultValue !== void 0 && D.parseArg === void 0)
				throw Error(`a default value for a required argument is never used: '${D.name()}'`);
			return (this.registeredArguments.push(D), this);
		}
		helpCommand(D, u) {
			if (typeof D === 'boolean') return ((this._addImplicitHelpCommand = D), this);
			D = D ?? 'help [command]';
			let [, F, E] = D.match(/([^ ]+) *(.*)/),
				B = u ?? 'display help for command',
				C = this.createCommand(F);
			if ((C.helpOption(!1), E)) C.arguments(E);
			if (B) C.description(B);
			return ((this._addImplicitHelpCommand = !0), (this._helpCommand = C), this);
		}
		addHelpCommand(D, u) {
			if (typeof D !== 'object') return (this.helpCommand(D, u), this);
			return ((this._addImplicitHelpCommand = !0), (this._helpCommand = D), this);
		}
		_getHelpCommand() {
			if (
				this._addImplicitHelpCommand ??
				(this.commands.length && !this._actionHandler && !this._findCommand('help'))
			) {
				if (this._helpCommand === void 0) this.helpCommand(void 0, void 0);
				return this._helpCommand;
			}
			return null;
		}
		hook(D, u) {
			let F = ['preSubcommand', 'preAction', 'postAction'];
			if (!F.includes(D))
				throw Error(`Unexpected value for event passed to hook : '${D}'.
Expecting one of '${F.join("', '")}'`);
			if (this._lifeCycleHooks[D]) this._lifeCycleHooks[D].push(u);
			else this._lifeCycleHooks[D] = [u];
			return this;
		}
		exitOverride(D) {
			if (D) this._exitCallback = D;
			else
				this._exitCallback = (u) => {
					if (u.code !== 'commander.executeSubCommandAsync') throw u;
				};
			return this;
		}
		_exit(D, u, F) {
			if (this._exitCallback) this._exitCallback(new Eu(D, u, F));
			b.exit(D);
		}
		action(D) {
			let u = (F) => {
				let E = this.registeredArguments.length,
					B = F.slice(0, E);
				if (this._storeOptionsAsProperties) B[E] = this;
				else B[E] = this.opts();
				return (B.push(this), D.apply(this, B));
			};
			return ((this._actionHandler = u), this);
		}
		createOption(D, u) {
			return new IF(D, u);
		}
		_callParseArg(D, u, F, E) {
			try {
				return D.parseArg(u, F);
			} catch (B) {
				if (B.code === 'commander.invalidArgument') {
					let C = `${E} ${B.message}`;
					this.error(C, { exitCode: B.exitCode, code: B.code });
				}
				throw B;
			}
		}
		_registerOption(D) {
			let u = (D.short && this._findOption(D.short)) || (D.long && this._findOption(D.long));
			if (u) {
				let F = D.long && this._findOption(D.long) ? D.long : D.short;
				throw Error(`Cannot add option '${D.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${F}'
-  already used by option '${u.flags}'`);
			}
			this.options.push(D);
		}
		_registerCommand(D) {
			let u = (E) => {
					return [E.name()].concat(E.aliases());
				},
				F = u(D).find((E) => this._findCommand(E));
			if (F) {
				let E = u(this._findCommand(F)).join('|'),
					B = u(D).join('|');
				throw Error(`cannot add command '${B}' as already have command '${E}'`);
			}
			this.commands.push(D);
		}
		addOption(D) {
			this._registerOption(D);
			let u = D.name(),
				F = D.attributeName();
			if (D.negate) {
				let B = D.long.replace(/^--no-/, '--');
				if (!this._findOption(B))
					this.setOptionValueWithSource(
						F,
						D.defaultValue === void 0 ? !0 : D.defaultValue,
						'default'
					);
			} else if (D.defaultValue !== void 0)
				this.setOptionValueWithSource(F, D.defaultValue, 'default');
			let E = (B, C, A) => {
				if (B == null && D.presetArg !== void 0) B = D.presetArg;
				let _ = this.getOptionValue(F);
				if (B !== null && D.parseArg) B = this._callParseArg(D, B, _, C);
				else if (B !== null && D.variadic) B = D._concatValue(B, _);
				if (B == null)
					if (D.negate) B = !1;
					else if (D.isBoolean() || D.optional) B = !0;
					else B = '';
				this.setOptionValueWithSource(F, B, A);
			};
			if (
				(this.on('option:' + u, (B) => {
					let C = `error: option '${D.flags}' argument '${B}' is invalid.`;
					E(B, C, 'cli');
				}),
				D.envVar)
			)
				this.on('optionEnv:' + u, (B) => {
					let C = `error: option '${D.flags}' value '${B}' from env '${D.envVar}' is invalid.`;
					E(B, C, 'env');
				});
			return this;
		}
		_optionEx(D, u, F, E, B) {
			if (typeof u === 'object' && u instanceof IF)
				throw Error(
					'To add an Option object use addOption() instead of option() or requiredOption()'
				);
			let C = this.createOption(u, F);
			if ((C.makeOptionMandatory(!!D.mandatory), typeof E === 'function'))
				C.default(B).argParser(E);
			else if (E instanceof RegExp) {
				let A = E;
				((E = (_, $) => {
					let Z = A.exec(_);
					return Z ? Z[0] : $;
				}),
					C.default(B).argParser(E));
			} else C.default(E);
			return this.addOption(C);
		}
		option(D, u, F, E) {
			return this._optionEx({}, D, u, F, E);
		}
		requiredOption(D, u, F, E) {
			return this._optionEx({ mandatory: !0 }, D, u, F, E);
		}
		combineFlagAndOptionalValue(D = !0) {
			return ((this._combineFlagAndOptionalValue = !!D), this);
		}
		allowUnknownOption(D = !0) {
			return ((this._allowUnknownOption = !!D), this);
		}
		allowExcessArguments(D = !0) {
			return ((this._allowExcessArguments = !!D), this);
		}
		enablePositionalOptions(D = !0) {
			return ((this._enablePositionalOptions = !!D), this);
		}
		passThroughOptions(D = !0) {
			return ((this._passThroughOptions = !!D), this._checkForBrokenPassThrough(), this);
		}
		_checkForBrokenPassThrough() {
			if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions)
				throw Error(
					`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
				);
		}
		storeOptionsAsProperties(D = !0) {
			if (this.options.length)
				throw Error('call .storeOptionsAsProperties() before adding options');
			if (Object.keys(this._optionValues).length)
				throw Error('call .storeOptionsAsProperties() before setting option values');
			return ((this._storeOptionsAsProperties = !!D), this);
		}
		getOptionValue(D) {
			if (this._storeOptionsAsProperties) return this[D];
			return this._optionValues[D];
		}
		setOptionValue(D, u) {
			return this.setOptionValueWithSource(D, u, void 0);
		}
		setOptionValueWithSource(D, u, F) {
			if (this._storeOptionsAsProperties) this[D] = u;
			else this._optionValues[D] = u;
			return ((this._optionValueSources[D] = F), this);
		}
		getOptionValueSource(D) {
			return this._optionValueSources[D];
		}
		getOptionValueSourceWithGlobals(D) {
			let u;
			return (
				this._getCommandAndAncestors().forEach((F) => {
					if (F.getOptionValueSource(D) !== void 0) u = F.getOptionValueSource(D);
				}),
				u
			);
		}
		_prepareUserArgs(D, u) {
			if (D !== void 0 && !Array.isArray(D))
				throw Error('first parameter to parse must be array or undefined');
			if (((u = u || {}), D === void 0 && u.from === void 0)) {
				if (b.versions?.electron) u.from = 'electron';
				let E = b.execArgv ?? [];
				if (E.includes('-e') || E.includes('--eval') || E.includes('-p') || E.includes('--print'))
					u.from = 'eval';
			}
			if (D === void 0) D = b.argv;
			this.rawArgs = D.slice();
			let F;
			switch (u.from) {
				case void 0:
				case 'node':
					((this._scriptPath = D[1]), (F = D.slice(2)));
					break;
				case 'electron':
					if (b.defaultApp) ((this._scriptPath = D[1]), (F = D.slice(2)));
					else F = D.slice(1);
					break;
				case 'user':
					F = D.slice(0);
					break;
				case 'eval':
					F = D.slice(1);
					break;
				default:
					throw Error(`unexpected parse option { from: '${u.from}' }`);
			}
			if (!this._name && this._scriptPath) this.nameFromFilename(this._scriptPath);
			return ((this._name = this._name || 'program'), F);
		}
		parse(D, u) {
			let F = this._prepareUserArgs(D, u);
			return (this._parseCommand([], F), this);
		}
		async parseAsync(D, u) {
			let F = this._prepareUserArgs(D, u);
			return (await this._parseCommand([], F), this);
		}
		_executeSubCommand(D, u) {
			u = u.slice();
			let F = !1,
				E = ['.js', '.ts', '.tsx', '.mjs', '.cjs'];
			function B(Z, z) {
				let J = JD.resolve(Z, z);
				if (Fu.existsSync(J)) return J;
				if (E.includes(JD.extname(z))) return;
				let Q = E.find((Y) => Fu.existsSync(`${J}${Y}`));
				if (Q) return `${J}${Q}`;
				return;
			}
			(this._checkForMissingMandatoryOptions(), this._checkForConflictingOptions());
			let C = D._executableFile || `${this._name}-${D._name}`,
				A = this._executableDir || '';
			if (this._scriptPath) {
				let Z;
				try {
					Z = Fu.realpathSync(this._scriptPath);
				} catch (z) {
					Z = this._scriptPath;
				}
				A = JD.resolve(JD.dirname(Z), A);
			}
			if (A) {
				let Z = B(A, C);
				if (!Z && !D._executableFile && this._scriptPath) {
					let z = JD.basename(this._scriptPath, JD.extname(this._scriptPath));
					if (z !== this._name) Z = B(A, `${z}-${D._name}`);
				}
				C = Z || C;
			}
			F = E.includes(JD.extname(C));
			let _;
			if (b.platform !== 'win32')
				if (F)
					(u.unshift(C),
						(u = OF(b.execArgv).concat(u)),
						(_ = uu.spawn(b.argv[0], u, { stdio: 'inherit' })));
				else _ = uu.spawn(C, u, { stdio: 'inherit' });
			else
				(u.unshift(C),
					(u = OF(b.execArgv).concat(u)),
					(_ = uu.spawn(b.execPath, u, { stdio: 'inherit' })));
			if (!_.killed)
				['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'].forEach((z) => {
					b.on(z, () => {
						if (_.killed === !1 && _.exitCode === null) _.kill(z);
					});
				});
			let $ = this._exitCallback;
			(_.on('close', (Z) => {
				if (((Z = Z ?? 1), !$)) b.exit(Z);
				else $(new Eu(Z, 'commander.executeSubCommandAsync', '(close)'));
			}),
				_.on('error', (Z) => {
					if (Z.code === 'ENOENT') {
						let z = A
								? `searched for local subcommand relative to directory '${A}'`
								: 'no directory for search for local subcommand, use .executableDir() to supply a custom directory',
							J = `'${C}' does not exist
 - if '${D._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${z}`;
						throw Error(J);
					} else if (Z.code === 'EACCES') throw Error(`'${C}' not executable`);
					if (!$) b.exit(1);
					else {
						let z = new Eu(1, 'commander.executeSubCommandAsync', '(error)');
						((z.nestedError = Z), $(z));
					}
				}),
				(this.runningCommand = _));
		}
		_dispatchSubcommand(D, u, F) {
			let E = this._findCommand(D);
			if (!E) this.help({ error: !0 });
			let B;
			return (
				(B = this._chainOrCallSubCommandHook(B, E, 'preSubcommand')),
				(B = this._chainOrCall(B, () => {
					if (E._executableHandler) this._executeSubCommand(E, u.concat(F));
					else return E._parseCommand(u, F);
				})),
				B
			);
		}
		_dispatchHelpCommand(D) {
			if (!D) this.help();
			let u = this._findCommand(D);
			if (u && !u._executableHandler) u.help();
			return this._dispatchSubcommand(
				D,
				[],
				[this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? '--help']
			);
		}
		_checkNumberOfArguments() {
			if (
				(this.registeredArguments.forEach((D, u) => {
					if (D.required && this.args[u] == null) this.missingArgument(D.name());
				}),
				this.registeredArguments.length > 0 &&
					this.registeredArguments[this.registeredArguments.length - 1].variadic)
			)
				return;
			if (this.args.length > this.registeredArguments.length) this._excessArguments(this.args);
		}
		_processArguments() {
			let D = (F, E, B) => {
				let C = E;
				if (E !== null && F.parseArg) {
					let A = `error: command-argument value '${E}' is invalid for argument '${F.name()}'.`;
					C = this._callParseArg(F, E, B, A);
				}
				return C;
			};
			this._checkNumberOfArguments();
			let u = [];
			(this.registeredArguments.forEach((F, E) => {
				let B = F.defaultValue;
				if (F.variadic) {
					if (E < this.args.length) {
						if (((B = this.args.slice(E)), F.parseArg))
							B = B.reduce((C, A) => {
								return D(F, A, C);
							}, F.defaultValue);
					} else if (B === void 0) B = [];
				} else if (E < this.args.length) {
					if (((B = this.args[E]), F.parseArg)) B = D(F, B, F.defaultValue);
				}
				u[E] = B;
			}),
				(this.processedArgs = u));
		}
		_chainOrCall(D, u) {
			if (D && D.then && typeof D.then === 'function') return D.then(() => u());
			return u();
		}
		_chainOrCallHooks(D, u) {
			let F = D,
				E = [];
			if (
				(this._getCommandAndAncestors()
					.reverse()
					.filter((B) => B._lifeCycleHooks[u] !== void 0)
					.forEach((B) => {
						B._lifeCycleHooks[u].forEach((C) => {
							E.push({ hookedCommand: B, callback: C });
						});
					}),
				u === 'postAction')
			)
				E.reverse();
			return (
				E.forEach((B) => {
					F = this._chainOrCall(F, () => {
						return B.callback(B.hookedCommand, this);
					});
				}),
				F
			);
		}
		_chainOrCallSubCommandHook(D, u, F) {
			let E = D;
			if (this._lifeCycleHooks[F] !== void 0)
				this._lifeCycleHooks[F].forEach((B) => {
					E = this._chainOrCall(E, () => {
						return B(this, u);
					});
				});
			return E;
		}
		_parseCommand(D, u) {
			let F = this.parseOptions(u);
			if (
				(this._parseOptionsEnv(),
				this._parseOptionsImplied(),
				(D = D.concat(F.operands)),
				(u = F.unknown),
				(this.args = D.concat(u)),
				D && this._findCommand(D[0]))
			)
				return this._dispatchSubcommand(D[0], D.slice(1), u);
			if (this._getHelpCommand() && D[0] === this._getHelpCommand().name())
				return this._dispatchHelpCommand(D[1]);
			if (this._defaultCommandName)
				return (
					this._outputHelpIfRequested(u),
					this._dispatchSubcommand(this._defaultCommandName, D, u)
				);
			if (
				this.commands.length &&
				this.args.length === 0 &&
				!this._actionHandler &&
				!this._defaultCommandName
			)
				this.help({ error: !0 });
			(this._outputHelpIfRequested(F.unknown),
				this._checkForMissingMandatoryOptions(),
				this._checkForConflictingOptions());
			let E = () => {
					if (F.unknown.length > 0) this.unknownOption(F.unknown[0]);
				},
				B = `command:${this.name()}`;
			if (this._actionHandler) {
				(E(), this._processArguments());
				let C;
				if (
					((C = this._chainOrCallHooks(C, 'preAction')),
					(C = this._chainOrCall(C, () => this._actionHandler(this.processedArgs))),
					this.parent)
				)
					C = this._chainOrCall(C, () => {
						this.parent.emit(B, D, u);
					});
				return ((C = this._chainOrCallHooks(C, 'postAction')), C);
			}
			if (this.parent && this.parent.listenerCount(B))
				(E(), this._processArguments(), this.parent.emit(B, D, u));
			else if (D.length) {
				if (this._findCommand('*')) return this._dispatchSubcommand('*', D, u);
				if (this.listenerCount('command:*')) this.emit('command:*', D, u);
				else if (this.commands.length) this.unknownCommand();
				else (E(), this._processArguments());
			} else if (this.commands.length) (E(), this.help({ error: !0 }));
			else (E(), this._processArguments());
		}
		_findCommand(D) {
			if (!D) return;
			return this.commands.find((u) => u._name === D || u._aliases.includes(D));
		}
		_findOption(D) {
			return this.options.find((u) => u.is(D));
		}
		_checkForMissingMandatoryOptions() {
			this._getCommandAndAncestors().forEach((D) => {
				D.options.forEach((u) => {
					if (u.mandatory && D.getOptionValue(u.attributeName()) === void 0)
						D.missingMandatoryOptionValue(u);
				});
			});
		}
		_checkForConflictingLocalOptions() {
			let D = this.options.filter((F) => {
				let E = F.attributeName();
				if (this.getOptionValue(E) === void 0) return !1;
				return this.getOptionValueSource(E) !== 'default';
			});
			D.filter((F) => F.conflictsWith.length > 0).forEach((F) => {
				let E = D.find((B) => F.conflictsWith.includes(B.attributeName()));
				if (E) this._conflictingOption(F, E);
			});
		}
		_checkForConflictingOptions() {
			this._getCommandAndAncestors().forEach((D) => {
				D._checkForConflictingLocalOptions();
			});
		}
		parseOptions(D) {
			let u = [],
				F = [],
				E = u,
				B = D.slice();
			function C(_) {
				return _.length > 1 && _[0] === '-';
			}
			let A = null;
			while (B.length) {
				let _ = B.shift();
				if (_ === '--') {
					if (E === F) E.push(_);
					E.push(...B);
					break;
				}
				if (A && !C(_)) {
					this.emit(`option:${A.name()}`, _);
					continue;
				}
				if (((A = null), C(_))) {
					let $ = this._findOption(_);
					if ($) {
						if ($.required) {
							let Z = B.shift();
							if (Z === void 0) this.optionMissingArgument($);
							this.emit(`option:${$.name()}`, Z);
						} else if ($.optional) {
							let Z = null;
							if (B.length > 0 && !C(B[0])) Z = B.shift();
							this.emit(`option:${$.name()}`, Z);
						} else this.emit(`option:${$.name()}`);
						A = $.variadic ? $ : null;
						continue;
					}
				}
				if (_.length > 2 && _[0] === '-' && _[1] !== '-') {
					let $ = this._findOption(`-${_[1]}`);
					if ($) {
						if ($.required || ($.optional && this._combineFlagAndOptionalValue))
							this.emit(`option:${$.name()}`, _.slice(2));
						else (this.emit(`option:${$.name()}`), B.unshift(`-${_.slice(2)}`));
						continue;
					}
				}
				if (/^--[^=]+=/.test(_)) {
					let $ = _.indexOf('='),
						Z = this._findOption(_.slice(0, $));
					if (Z && (Z.required || Z.optional)) {
						this.emit(`option:${Z.name()}`, _.slice($ + 1));
						continue;
					}
				}
				if (C(_)) E = F;
				if (
					(this._enablePositionalOptions || this._passThroughOptions) &&
					u.length === 0 &&
					F.length === 0
				) {
					if (this._findCommand(_)) {
						if ((u.push(_), B.length > 0)) F.push(...B);
						break;
					} else if (this._getHelpCommand() && _ === this._getHelpCommand().name()) {
						if ((u.push(_), B.length > 0)) u.push(...B);
						break;
					} else if (this._defaultCommandName) {
						if ((F.push(_), B.length > 0)) F.push(...B);
						break;
					}
				}
				if (this._passThroughOptions) {
					if ((E.push(_), B.length > 0)) E.push(...B);
					break;
				}
				E.push(_);
			}
			return { operands: u, unknown: F };
		}
		opts() {
			if (this._storeOptionsAsProperties) {
				let D = {},
					u = this.options.length;
				for (let F = 0; F < u; F++) {
					let E = this.options[F].attributeName();
					D[E] = E === this._versionOptionName ? this._version : this[E];
				}
				return D;
			}
			return this._optionValues;
		}
		optsWithGlobals() {
			return this._getCommandAndAncestors().reduce((D, u) => Object.assign(D, u.opts()), {});
		}
		error(D, u) {
			if (
				(this._outputConfiguration.outputError(
					`${D}
`,
					this._outputConfiguration.writeErr
				),
				typeof this._showHelpAfterError === 'string')
			)
				this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
			else if (this._showHelpAfterError)
				(this._outputConfiguration.writeErr(`
`),
					this.outputHelp({ error: !0 }));
			let F = u || {},
				E = F.exitCode || 1,
				B = F.code || 'commander.error';
			this._exit(E, B, D);
		}
		_parseOptionsEnv() {
			this.options.forEach((D) => {
				if (D.envVar && D.envVar in b.env) {
					let u = D.attributeName();
					if (
						this.getOptionValue(u) === void 0 ||
						['default', 'config', 'env'].includes(this.getOptionValueSource(u))
					)
						if (D.required || D.optional) this.emit(`optionEnv:${D.name()}`, b.env[D.envVar]);
						else this.emit(`optionEnv:${D.name()}`);
				}
			});
		}
		_parseOptionsImplied() {
			let D = new o1(this.options),
				u = (F) => {
					return (
						this.getOptionValue(F) !== void 0 &&
						!['default', 'implied'].includes(this.getOptionValueSource(F))
					);
				};
			this.options
				.filter(
					(F) =>
						F.implied !== void 0 &&
						u(F.attributeName()) &&
						D.valueFromOption(this.getOptionValue(F.attributeName()), F)
				)
				.forEach((F) => {
					Object.keys(F.implied)
						.filter((E) => !u(E))
						.forEach((E) => {
							this.setOptionValueWithSource(E, F.implied[E], 'implied');
						});
				});
		}
		missingArgument(D) {
			let u = `error: missing required argument '${D}'`;
			this.error(u, { code: 'commander.missingArgument' });
		}
		optionMissingArgument(D) {
			let u = `error: option '${D.flags}' argument missing`;
			this.error(u, { code: 'commander.optionMissingArgument' });
		}
		missingMandatoryOptionValue(D) {
			let u = `error: required option '${D.flags}' not specified`;
			this.error(u, { code: 'commander.missingMandatoryOptionValue' });
		}
		_conflictingOption(D, u) {
			let F = (C) => {
					let A = C.attributeName(),
						_ = this.getOptionValue(A),
						$ = this.options.find((z) => z.negate && A === z.attributeName()),
						Z = this.options.find((z) => !z.negate && A === z.attributeName());
					if (
						$ &&
						(($.presetArg === void 0 && _ === !1) || ($.presetArg !== void 0 && _ === $.presetArg))
					)
						return $;
					return Z || C;
				},
				E = (C) => {
					let A = F(C),
						_ = A.attributeName();
					if (this.getOptionValueSource(_) === 'env') return `environment variable '${A.envVar}'`;
					return `option '${A.flags}'`;
				},
				B = `error: ${E(D)} cannot be used with ${E(u)}`;
			this.error(B, { code: 'commander.conflictingOption' });
		}
		unknownOption(D) {
			if (this._allowUnknownOption) return;
			let u = '';
			if (D.startsWith('--') && this._showSuggestionAfterError) {
				let E = [],
					B = this;
				do {
					let C = B.createHelp()
						.visibleOptions(B)
						.filter((A) => A.long)
						.map((A) => A.long);
					((E = E.concat(C)), (B = B.parent));
				} while (B && !B._enablePositionalOptions);
				u = jF(D, E);
			}
			let F = `error: unknown option '${D}'${u}`;
			this.error(F, { code: 'commander.unknownOption' });
		}
		_excessArguments(D) {
			if (this._allowExcessArguments) return;
			let u = this.registeredArguments.length,
				F = u === 1 ? '' : 's',
				B = `error: too many arguments${this.parent ? ` for '${this.name()}'` : ''}. Expected ${u} argument${F} but got ${D.length}.`;
			this.error(B, { code: 'commander.excessArguments' });
		}
		unknownCommand() {
			let D = this.args[0],
				u = '';
			if (this._showSuggestionAfterError) {
				let E = [];
				(this.createHelp()
					.visibleCommands(this)
					.forEach((B) => {
						if ((E.push(B.name()), B.alias())) E.push(B.alias());
					}),
					(u = jF(D, E)));
			}
			let F = `error: unknown command '${D}'${u}`;
			this.error(F, { code: 'commander.unknownCommand' });
		}
		version(D, u, F) {
			if (D === void 0) return this._version;
			((this._version = D), (u = u || '-V, --version'), (F = F || 'output the version number'));
			let E = this.createOption(u, F);
			return (
				(this._versionOptionName = E.attributeName()),
				this._registerOption(E),
				this.on('option:' + E.name(), () => {
					(this._outputConfiguration.writeOut(`${D}
`),
						this._exit(0, 'commander.version', D));
				}),
				this
			);
		}
		description(D, u) {
			if (D === void 0 && u === void 0) return this._description;
			if (((this._description = D), u)) this._argsDescription = u;
			return this;
		}
		summary(D) {
			if (D === void 0) return this._summary;
			return ((this._summary = D), this);
		}
		alias(D) {
			if (D === void 0) return this._aliases[0];
			let u = this;
			if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler)
				u = this.commands[this.commands.length - 1];
			if (D === u._name) throw Error("Command alias can't be the same as its name");
			let F = this.parent?._findCommand(D);
			if (F) {
				let E = [F.name()].concat(F.aliases()).join('|');
				throw Error(
					`cannot add alias '${D}' to command '${this.name()}' as already have command '${E}'`
				);
			}
			return (u._aliases.push(D), this);
		}
		aliases(D) {
			if (D === void 0) return this._aliases;
			return (D.forEach((u) => this.alias(u)), this);
		}
		usage(D) {
			if (D === void 0) {
				if (this._usage) return this._usage;
				let u = this.registeredArguments.map((F) => {
					return r1(F);
				});
				return []
					.concat(
						this.options.length || this._helpOption !== null ? '[options]' : [],
						this.commands.length ? '[command]' : [],
						this.registeredArguments.length ? u : []
					)
					.join(' ');
			}
			return ((this._usage = D), this);
		}
		name(D) {
			if (D === void 0) return this._name;
			return ((this._name = D), this);
		}
		nameFromFilename(D) {
			return ((this._name = JD.basename(D, JD.extname(D))), this);
		}
		executableDir(D) {
			if (D === void 0) return this._executableDir;
			return ((this._executableDir = D), this);
		}
		helpInformation(D) {
			let u = this.createHelp();
			if (u.helpWidth === void 0)
				u.helpWidth =
					D && D.error
						? this._outputConfiguration.getErrHelpWidth()
						: this._outputConfiguration.getOutHelpWidth();
			return u.formatHelp(this, u);
		}
		_getHelpContext(D) {
			D = D || {};
			let u = { error: !!D.error },
				F;
			if (u.error) F = (E) => this._outputConfiguration.writeErr(E);
			else F = (E) => this._outputConfiguration.writeOut(E);
			return ((u.write = D.write || F), (u.command = this), u);
		}
		outputHelp(D) {
			let u;
			if (typeof D === 'function') ((u = D), (D = void 0));
			let F = this._getHelpContext(D);
			(this._getCommandAndAncestors()
				.reverse()
				.forEach((B) => B.emit('beforeAllHelp', F)),
				this.emit('beforeHelp', F));
			let E = this.helpInformation(F);
			if (u) {
				if (((E = u(E)), typeof E !== 'string' && !Buffer.isBuffer(E)))
					throw Error('outputHelp callback must return a string or a Buffer');
			}
			if ((F.write(E), this._getHelpOption()?.long)) this.emit(this._getHelpOption().long);
			(this.emit('afterHelp', F),
				this._getCommandAndAncestors().forEach((B) => B.emit('afterAllHelp', F)));
		}
		helpOption(D, u) {
			if (typeof D === 'boolean') {
				if (D) this._helpOption = this._helpOption ?? void 0;
				else this._helpOption = null;
				return this;
			}
			return (
				(D = D ?? '-h, --help'),
				(u = u ?? 'display help for command'),
				(this._helpOption = this.createOption(D, u)),
				this
			);
		}
		_getHelpOption() {
			if (this._helpOption === void 0) this.helpOption(void 0, void 0);
			return this._helpOption;
		}
		addHelpOption(D) {
			return ((this._helpOption = D), this);
		}
		help(D) {
			this.outputHelp(D);
			let u = b.exitCode || 0;
			if (u === 0 && D && typeof D !== 'function' && D.error) u = 1;
			this._exit(u, 'commander.help', '(outputHelp)');
		}
		addHelpText(D, u) {
			let F = ['beforeAll', 'before', 'after', 'afterAll'];
			if (!F.includes(D))
				throw Error(`Unexpected value for position to addHelpText.
Expecting one of '${F.join("', '")}'`);
			let E = `${D}Help`;
			return (
				this.on(E, (B) => {
					let C;
					if (typeof u === 'function') C = u({ error: B.error, command: B.command });
					else C = u;
					if (C)
						B.write(`${C}
`);
				}),
				this
			);
		}
		_outputHelpIfRequested(D) {
			let u = this._getHelpOption();
			if (u && D.find((E) => u.is(E)))
				(this.outputHelp(), this._exit(0, 'commander.helpDisplayed', '(outputHelp)'));
		}
	}
	function OF(D) {
		return D.map((u) => {
			if (!u.startsWith('--inspect')) return u;
			let F,
				E = '127.0.0.1',
				B = '9229',
				C;
			if ((C = u.match(/^(--inspect(-brk)?)$/)) !== null) F = C[1];
			else if ((C = u.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null)
				if (((F = C[1]), /^\d+$/.test(C[3]))) B = C[3];
				else E = C[3];
			else if ((C = u.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null)
				((F = C[1]), (E = C[3]), (B = C[4]));
			if (F && B !== '0') return `${F}=${E}:${parseInt(B) + 1}`;
			return u;
		});
	}
	e1.Command = Bu;
});
var kF = G((EB) => {
	var { Argument: SF } = G0(),
		{ Command: Cu } = PF(),
		{ CommanderError: uB, InvalidArgumentError: wF } = iD(),
		{ Help: FB } = e0(),
		{ Option: bF } = Du();
	EB.program = new Cu();
	EB.createCommand = (D) => new Cu(D);
	EB.createOption = (D, u) => new bF(D, u);
	EB.createArgument = (D, u) => new SF(D, u);
	EB.Command = Cu;
	EB.Option = bF;
	EB.Argument = SF;
	EB.Help = FB;
	EB.CommanderError = uB;
	EB.InvalidArgumentError = wF;
	EB.InvalidOptionArgumentError = wF;
});
var R0 = G((Y_, F2) => {
	var Lu = [],
		u2 = 0,
		h = (D, u) => {
			if (u2 >= u) Lu.push(D);
		};
	h.WARN = 1;
	h.INFO = 2;
	h.DEBUG = 3;
	h.reset = () => {
		Lu = [];
	};
	h.setDebugLevel = (D) => {
		u2 = D;
	};
	h.warn = (D) => h(D, h.WARN);
	h.info = (D) => h(D, h.INFO);
	h.debug = (D) => h(D, h.DEBUG);
	h.debugMessages = () => Lu;
	F2.exports = h;
});
var B2 = G((z_, E2) => {
	E2.exports = ({ onlyFirst: D = !1 } = {}) => {
		let u = [
			'[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
			'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
		].join('|');
		return new RegExp(u, D ? void 0 : 'g');
	};
});
var A2 = G((H_, C2) => {
	var cB = B2();
	C2.exports = (D) => (typeof D === 'string' ? D.replace(cB(), '') : D);
});
var $2 = G((J_, Vu) => {
	var _2 = (D) => {
		if (Number.isNaN(D)) return !1;
		if (
			D >= 4352 &&
			(D <= 4447 ||
				D === 9001 ||
				D === 9002 ||
				(11904 <= D && D <= 12871 && D !== 12351) ||
				(12880 <= D && D <= 19903) ||
				(19968 <= D && D <= 42182) ||
				(43360 <= D && D <= 43388) ||
				(44032 <= D && D <= 55203) ||
				(63744 <= D && D <= 64255) ||
				(65040 <= D && D <= 65049) ||
				(65072 <= D && D <= 65131) ||
				(65281 <= D && D <= 65376) ||
				(65504 <= D && D <= 65510) ||
				(110592 <= D && D <= 110593) ||
				(127488 <= D && D <= 127569) ||
				(131072 <= D && D <= 262141))
		)
			return !0;
		return !1;
	};
	Vu.exports = _2;
	Vu.exports.default = _2;
});
var X2 = G((Q_, Z2) => {
	Z2.exports = function () {
		return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F|\uD83D\uDC68(?:\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68\uD83C\uDFFB|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83D[\uDC66\uDC67]|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708])\uFE0F|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C[\uDFFB-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)\uD83C\uDFFB|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB\uDFFC])|\uD83D\uDC69(?:\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D\uD83D\uDC69)(?:\uD83C[\uDFFB-\uDFFD])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83C\uDFF4\u200D\u2620)\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDF6\uD83C\uDDE6|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDB5\uDDB6\uDDBB\uDDD2-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5\uDEEB\uDEEC\uDEF4-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFA\uDFE0-\uDFEB]|\uD83E[\uDD0D-\uDD3A\uDD3C-\uDD45\uDD47-\uDD71\uDD73-\uDD76\uDD7A-\uDDA2\uDDA5-\uDDAA\uDDAE-\uDDCA\uDDCD-\uDDFF\uDE70-\uDE73\uDE78-\uDE7A\uDE80-\uDE82\uDE90-\uDE95])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
	};
});
var z2 = G((G_, Nu) => {
	var lB = A2(),
		pB = $2(),
		aB = X2(),
		Y2 = (D) => {
			if (typeof D !== 'string' || D.length === 0) return 0;
			if (((D = lB(D)), D.length === 0)) return 0;
			D = D.replace(aB(), '  ');
			let u = 0;
			for (let F = 0; F < D.length; F++) {
				let E = D.codePointAt(F);
				if (E <= 31 || (E >= 127 && E <= 159)) continue;
				if (E >= 768 && E <= 879) continue;
				if (E > 65535) F++;
				u += pB(E) ? 2 : 1;
			}
			return u;
		};
	Nu.exports = Y2;
	Nu.exports.default = Y2;
});
var Tu = G((K_, G2) => {
	var H2 = z2();
	function q0(D) {
		return D ? /\u001b\[((?:\d*;){0,5}\d*)m/g : /\u001b\[(?:\d*;){0,5}\d*m/g;
	}
	function ED(D) {
		let u = q0();
		return ('' + D)
			.replace(u, '')
			.split(
				`
`
			)
			.reduce(function (B, C) {
				return H2(C) > B ? H2(C) : B;
			}, 0);
	}
	function tD(D, u) {
		return Array(u + 1).join(D);
	}
	function iB(D, u, F, E) {
		let B = ED(D);
		if (u + 1 >= B) {
			let C = u - B;
			switch (E) {
				case 'right': {
					D = tD(F, C) + D;
					break;
				}
				case 'center': {
					let A = Math.ceil(C / 2),
						_ = C - A;
					D = tD(F, _) + D + tD(F, A);
					break;
				}
				default: {
					D = D + tD(F, C);
					break;
				}
			}
		}
		return D;
	}
	var hD = {};
	function oD(D, u, F) {
		((u = '\x1B[' + u + 'm'),
			(F = '\x1B[' + F + 'm'),
			(hD[u] = { set: D, to: !0 }),
			(hD[F] = { set: D, to: !1 }),
			(hD[D] = { on: u, off: F }));
	}
	oD('bold', 1, 22);
	oD('italics', 3, 23);
	oD('underline', 4, 24);
	oD('inverse', 7, 27);
	oD('strikethrough', 9, 29);
	function J2(D, u) {
		let F = u[1] ? parseInt(u[1].split(';')[0]) : 0;
		if ((F >= 30 && F <= 39) || (F >= 90 && F <= 97)) {
			D.lastForegroundAdded = u[0];
			return;
		}
		if ((F >= 40 && F <= 49) || (F >= 100 && F <= 107)) {
			D.lastBackgroundAdded = u[0];
			return;
		}
		if (F === 0) {
			for (let B in D) if (Object.prototype.hasOwnProperty.call(D, B)) delete D[B];
			return;
		}
		let E = hD[u[0]];
		if (E) D[E.set] = E.to;
	}
	function nB(D) {
		let u = q0(!0),
			F = u.exec(D),
			E = {};
		while (F !== null) (J2(E, F), (F = u.exec(D)));
		return E;
	}
	function Q2(D, u) {
		let { lastBackgroundAdded: F, lastForegroundAdded: E } = D;
		if (
			(delete D.lastBackgroundAdded,
			delete D.lastForegroundAdded,
			Object.keys(D).forEach(function (B) {
				if (D[B]) u += hD[B].off;
			}),
			F && F != '\x1B[49m')
		)
			u += '\x1B[49m';
		if (E && E != '\x1B[39m') u += '\x1B[39m';
		return u;
	}
	function sB(D, u) {
		let { lastBackgroundAdded: F, lastForegroundAdded: E } = D;
		if (
			(delete D.lastBackgroundAdded,
			delete D.lastForegroundAdded,
			Object.keys(D).forEach(function (B) {
				if (D[B]) u = hD[B].on + u;
			}),
			F && F != '\x1B[49m')
		)
			u = F + u;
		if (E && E != '\x1B[39m') u = E + u;
		return u;
	}
	function rB(D, u) {
		if (D.length === ED(D)) return D.substr(0, u);
		while (ED(D) > u) D = D.slice(0, -1);
		return D;
	}
	function tB(D, u) {
		let F = q0(!0),
			E = D.split(q0()),
			B = 0,
			C = 0,
			A = '',
			_,
			$ = {};
		while (C < u) {
			_ = F.exec(D);
			let Z = E[B];
			if ((B++, C + ED(Z) > u)) Z = rB(Z, u - C);
			if (((A += Z), (C += ED(Z)), C < u)) {
				if (!_) break;
				((A += _[0]), J2($, _));
			}
		}
		return Q2($, A);
	}
	function oB(D, u, F) {
		if (((F = F || '\u2026'), ED(D) <= u)) return D;
		u -= ED(F);
		let B = tB(D, u);
		B += F;
		let C = '\x1B]8;;\x07';
		if (D.includes(C) && !B.includes(C)) B += C;
		return B;
	}
	function eB() {
		return {
			chars: {
				top: '\u2500',
				'top-mid': '\u252C',
				'top-left': '\u250C',
				'top-right': '\u2510',
				bottom: '\u2500',
				'bottom-mid': '\u2534',
				'bottom-left': '\u2514',
				'bottom-right': '\u2518',
				left: '\u2502',
				'left-mid': '\u251C',
				mid: '\u2500',
				'mid-mid': '\u253C',
				right: '\u2502',
				'right-mid': '\u2524',
				middle: '\u2502'
			},
			truncate: '\u2026',
			colWidths: [],
			rowHeights: [],
			colAligns: [],
			rowAligns: [],
			style: {
				'padding-left': 1,
				'padding-right': 1,
				head: ['red'],
				border: ['grey'],
				compact: !1
			},
			head: []
		};
	}
	function D7(D, u) {
		((D = D || {}), (u = u || eB()));
		let F = Object.assign({}, u, D);
		return (
			(F.chars = Object.assign({}, u.chars, D.chars)),
			(F.style = Object.assign({}, u.style, D.style)),
			F
		);
	}
	function u7(D, u) {
		let F = [],
			E = u.split(/(\s+)/g),
			B = [],
			C = 0,
			A;
		for (let _ = 0; _ < E.length; _ += 2) {
			let $ = E[_],
				Z = C + ED($);
			if (C > 0 && A) Z += A.length;
			if (Z > D) {
				if (C !== 0) F.push(B.join(''));
				((B = [$]), (C = ED($)));
			} else (B.push(A || '', $), (C = Z));
			A = E[_ + 1];
		}
		if (C) F.push(B.join(''));
		return F;
	}
	function F7(D, u) {
		let F = [],
			E = '';
		function B(A, _) {
			if (E.length && _) E += _;
			E += A;
			while (E.length > D) (F.push(E.slice(0, D)), (E = E.slice(D)));
		}
		let C = u.split(/(\s+)/g);
		for (let A = 0; A < C.length; A += 2) B(C[A], A && C[A - 1]);
		if (E.length) F.push(E);
		return F;
	}
	function E7(D, u, F = !0) {
		let E = [];
		u = u.split(`
`);
		let B = F ? u7 : F7;
		for (let C = 0; C < u.length; C++) E.push.apply(E, B(D, u[C]));
		return E;
	}
	function B7(D) {
		let u = {},
			F = [];
		for (let E = 0; E < D.length; E++) {
			let B = sB(u, D[E]);
			u = nB(B);
			let C = Object.assign({}, u);
			F.push(Q2(C, B));
		}
		return F;
	}
	function C7(D, u) {
		return ['\x1B]', '8', ';', ';', D || u, '\x07', u, '\x1B]', '8', ';', ';', '\x07'].join('');
	}
	G2.exports = {
		strlen: ED,
		repeat: tD,
		pad: iB,
		truncate: oB,
		mergeOptions: D7,
		wordWrap: E7,
		colorizeLines: B7,
		hyperlink: C7
	};
});
var W2 = G((U_, N0) => {
	var { info: A7, debug: M2 } = R0(),
		i = Tu();
	class eD {
		constructor(D) {
			(this.setOptions(D), (this.x = null), (this.y = null));
		}
		setOptions(D) {
			if (['boolean', 'number', 'bigint', 'string'].indexOf(typeof D) !== -1)
				D = { content: '' + D };
			((D = D || {}), (this.options = D));
			let u = D.content;
			if (['boolean', 'number', 'bigint', 'string'].indexOf(typeof u) !== -1)
				this.content = String(u);
			else if (!u) this.content = this.options.href || '';
			else throw Error('Content needs to be a primitive, got: ' + typeof u);
			if (((this.colSpan = D.colSpan || 1), (this.rowSpan = D.rowSpan || 1), this.options.href))
				Object.defineProperty(this, 'href', {
					get() {
						return this.options.href;
					}
				});
		}
		mergeTableOptions(D, u) {
			this.cells = u;
			let F = this.options.chars || {},
				E = D.chars,
				B = (this.chars = {});
			($7.forEach(function (_) {
				Iu(F, E, _, B);
			}),
				(this.truncate = this.options.truncate || D.truncate));
			let C = (this.options.style = this.options.style || {}),
				A = D.style;
			(Iu(C, A, 'padding-left', this),
				Iu(C, A, 'padding-right', this),
				(this.head = C.head || A.head),
				(this.border = C.border || A.border),
				(this.fixedWidth = D.colWidths[this.x]),
				(this.lines = this.computeLines(D)),
				(this.desiredWidth = i.strlen(this.content) + this.paddingLeft + this.paddingRight),
				(this.desiredHeight = this.lines.length));
		}
		computeLines(D) {
			let u = D.wordWrap || D.textWrap,
				{ wordWrap: F = u } = this.options;
			if (this.fixedWidth && F) {
				if (((this.fixedWidth -= this.paddingLeft + this.paddingRight), this.colSpan)) {
					let C = 1;
					while (C < this.colSpan) ((this.fixedWidth += D.colWidths[this.x + C]), C++);
				}
				let { wrapOnWordBoundary: E = !0 } = D,
					{ wrapOnWordBoundary: B = E } = this.options;
				return this.wrapLines(i.wordWrap(this.fixedWidth, this.content, B));
			}
			return this.wrapLines(
				this.content.split(`
`)
			);
		}
		wrapLines(D) {
			let u = i.colorizeLines(D);
			if (this.href) return u.map((F) => i.hyperlink(this.href, F));
			return u;
		}
		init(D) {
			let u = this.x,
				F = this.y;
			((this.widths = D.colWidths.slice(u, u + this.colSpan)),
				(this.heights = D.rowHeights.slice(F, F + this.rowSpan)),
				(this.width = this.widths.reduce(U2, -1)),
				(this.height = this.heights.reduce(U2, -1)),
				(this.hAlign = this.options.hAlign || D.colAligns[u]),
				(this.vAlign = this.options.vAlign || D.rowAligns[F]),
				(this.drawRight = u + this.colSpan == D.colWidths.length));
		}
		draw(D, u) {
			if (D == 'top') return this.drawTop(this.drawRight);
			if (D == 'bottom') return this.drawBottom(this.drawRight);
			let F = i.truncate(this.content, 10, this.truncate);
			if (!D) A7(`${this.y}-${this.x}: ${this.rowSpan - D}x${this.colSpan} Cell ${F}`);
			let E = Math.max(this.height - this.lines.length, 0),
				B;
			switch (this.vAlign) {
				case 'center':
					B = Math.ceil(E / 2);
					break;
				case 'bottom':
					B = E;
					break;
				default:
					B = 0;
			}
			if (D < B || D >= B + this.lines.length) return this.drawEmpty(this.drawRight, u);
			let C = this.lines.length > this.height && D + 1 >= this.height;
			return this.drawLine(D - B, this.drawRight, C, u);
		}
		drawTop(D) {
			let u = [];
			if (this.cells)
				this.widths.forEach(function (F, E) {
					(u.push(this._topLeftChar(E)),
						u.push(i.repeat(this.chars[this.y == 0 ? 'top' : 'mid'], F)));
				}, this);
			else
				(u.push(this._topLeftChar(0)),
					u.push(i.repeat(this.chars[this.y == 0 ? 'top' : 'mid'], this.width)));
			if (D) u.push(this.chars[this.y == 0 ? 'topRight' : 'rightMid']);
			return this.wrapWithStyleColors('border', u.join(''));
		}
		_topLeftChar(D) {
			let u = this.x + D,
				F;
			if (this.y == 0) F = u == 0 ? 'topLeft' : D == 0 ? 'topMid' : 'top';
			else if (u == 0) F = 'leftMid';
			else if (((F = D == 0 ? 'midMid' : 'bottomMid'), this.cells)) {
				if (this.cells[this.y - 1][u] instanceof eD.ColSpanCell) F = D == 0 ? 'topMid' : 'mid';
				if (D == 0) {
					let B = 1;
					while (this.cells[this.y][u - B] instanceof eD.ColSpanCell) B++;
					if (this.cells[this.y][u - B] instanceof eD.RowSpanCell) F = 'leftMid';
				}
			}
			return this.chars[F];
		}
		wrapWithStyleColors(D, u) {
			if (this[D] && this[D].length)
				try {
					let F = (() => {
						throw new Error('Cannot require module ' + '@colors/colors/safe');
					})();
					for (let E = this[D].length - 1; E >= 0; E--) F = F[this[D][E]];
					return F(u);
				} catch (F) {
					return u;
				}
			else return u;
		}
		drawLine(D, u, F, E) {
			let B = this.chars[this.x == 0 ? 'left' : 'middle'];
			if (this.x && E && this.cells) {
				let J = this.cells[this.y + E][this.x - 1];
				while (J instanceof L0) J = this.cells[J.y][J.x - 1];
				if (!(J instanceof V0)) B = this.chars.rightMid;
			}
			let C = i.repeat(' ', this.paddingLeft),
				A = u ? this.chars.right : '',
				_ = i.repeat(' ', this.paddingRight),
				$ = this.lines[D],
				Z = this.width - (this.paddingLeft + this.paddingRight);
			if (F) $ += this.truncate || '\u2026';
			let z = i.truncate($, Z, this.truncate);
			return ((z = i.pad(z, Z, ' ', this.hAlign)), (z = C + z + _), this.stylizeLine(B, z, A));
		}
		stylizeLine(D, u, F) {
			if (
				((D = this.wrapWithStyleColors('border', D)),
				(F = this.wrapWithStyleColors('border', F)),
				this.y === 0)
			)
				u = this.wrapWithStyleColors('head', u);
			return D + u + F;
		}
		drawBottom(D) {
			let u = this.chars[this.x == 0 ? 'bottomLeft' : 'bottomMid'],
				F = i.repeat(this.chars.bottom, this.width),
				E = D ? this.chars.bottomRight : '';
			return this.wrapWithStyleColors('border', u + F + E);
		}
		drawEmpty(D, u) {
			let F = this.chars[this.x == 0 ? 'left' : 'middle'];
			if (this.x && u && this.cells) {
				let C = this.cells[this.y + u][this.x - 1];
				while (C instanceof L0) C = this.cells[C.y][C.x - 1];
				if (!(C instanceof V0)) F = this.chars.rightMid;
			}
			let E = D ? this.chars.right : '',
				B = i.repeat(' ', this.width);
			return this.stylizeLine(F, B, E);
		}
	}
	class L0 {
		constructor() {}
		draw(D) {
			if (typeof D === 'number') M2(`${this.y}-${this.x}: 1x1 ColSpanCell`);
			return '';
		}
		init() {}
		mergeTableOptions() {}
	}
	class V0 {
		constructor(D) {
			this.originalCell = D;
		}
		init(D) {
			let u = this.y,
				F = this.originalCell.y;
			((this.cellOffset = u - F), (this.offset = _7(D.rowHeights, F, this.cellOffset)));
		}
		draw(D) {
			if (D == 'top') return this.originalCell.draw(this.offset, this.cellOffset);
			if (D == 'bottom') return this.originalCell.draw('bottom');
			return (
				M2(`${this.y}-${this.x}: 1x${this.colSpan} RowSpanCell for ${this.originalCell.content}`),
				this.originalCell.draw(this.offset + 1 + D)
			);
		}
		mergeTableOptions() {}
	}
	function K2(...D) {
		return D.filter((u) => u !== void 0 && u !== null).shift();
	}
	function Iu(D, u, F, E) {
		let B = F.split('-');
		if (B.length > 1)
			((B[1] = B[1].charAt(0).toUpperCase() + B[1].substr(1)),
				(B = B.join('')),
				(E[B] = K2(D[B], D[F], u[B], u[F])));
		else E[F] = K2(D[F], u[F]);
	}
	function _7(D, u, F) {
		let E = D[u];
		for (let B = 1; B < F; B++) E += 1 + D[u + B];
		return E;
	}
	function U2(D, u) {
		return D + u + 1;
	}
	var $7 = [
		'top',
		'top-mid',
		'top-left',
		'top-right',
		'bottom',
		'bottom-mid',
		'bottom-left',
		'bottom-right',
		'left',
		'left-mid',
		'mid',
		'mid-mid',
		'right',
		'right-mid',
		'middle'
	];
	N0.exports = eD;
	N0.exports.ColSpanCell = L0;
	N0.exports.RowSpanCell = V0;
});
var L2 = G((M_, q2) => {
	var { warn: Z7, debug: X7 } = R0(),
		ju = W2(),
		{ ColSpanCell: Y7, RowSpanCell: z7 } = ju;
	(function () {
		function D(Y, H) {
			if (Y[H] > 0) return D(Y, H + 1);
			return H;
		}
		function u(Y) {
			let H = {};
			Y.forEach(function (K, M) {
				let W = 0;
				(K.forEach(function (L) {
					((L.y = M), (L.x = M ? D(H, W) : W));
					let x = L.rowSpan || 1,
						m = L.colSpan || 1;
					if (x > 1) for (let pD = 0; pD < m; pD++) H[L.x + pD] = x;
					W = L.x + m;
				}),
					Object.keys(H).forEach((L) => {
						if ((H[L]--, H[L] < 1)) delete H[L];
					}));
			});
		}
		function F(Y) {
			let H = 0;
			return (
				Y.forEach(function (K) {
					K.forEach(function (M) {
						H = Math.max(H, M.x + (M.colSpan || 1));
					});
				}),
				H
			);
		}
		function E(Y) {
			return Y.length;
		}
		function B(Y, H) {
			let K = Y.y,
				M = Y.y - 1 + (Y.rowSpan || 1),
				W = H.y,
				L = H.y - 1 + (H.rowSpan || 1),
				x = !(K > L || W > M),
				m = Y.x,
				pD = Y.x - 1 + (Y.colSpan || 1),
				W1 = H.x,
				R1 = H.x - 1 + (H.colSpan || 1),
				q1 = !(m > R1 || W1 > pD);
			return x && q1;
		}
		function C(Y, H, K) {
			let M = Math.min(Y.length - 1, K),
				W = { x: H, y: K };
			for (let L = 0; L <= M; L++) {
				let x = Y[L];
				for (let m = 0; m < x.length; m++) if (B(W, x[m])) return !0;
			}
			return !1;
		}
		function A(Y, H, K, M) {
			for (let W = K; W < M; W++) if (C(Y, W, H)) return !1;
			return !0;
		}
		function _(Y) {
			Y.forEach(function (H, K) {
				H.forEach(function (M) {
					for (let W = 1; W < M.rowSpan; W++) {
						let L = new z7(M);
						((L.x = M.x), (L.y = M.y + W), (L.colSpan = M.colSpan), Z(L, Y[K + W]));
					}
				});
			});
		}
		function $(Y) {
			for (let H = Y.length - 1; H >= 0; H--) {
				let K = Y[H];
				for (let M = 0; M < K.length; M++) {
					let W = K[M];
					for (let L = 1; L < W.colSpan; L++) {
						let x = new Y7();
						((x.x = W.x + L), (x.y = W.y), K.splice(M + 1, 0, x));
					}
				}
			}
		}
		function Z(Y, H) {
			let K = 0;
			while (K < H.length && H[K].x < Y.x) K++;
			H.splice(K, 0, Y);
		}
		function z(Y) {
			let H = E(Y),
				K = F(Y);
			X7(`Max rows: ${H}; Max cols: ${K}`);
			for (let M = 0; M < H; M++)
				for (let W = 0; W < K; W++)
					if (!C(Y, W, M)) {
						let L = { x: W, y: M, colSpan: 1, rowSpan: 1 };
						W++;
						while (W < K && !C(Y, W, M)) (L.colSpan++, W++);
						let x = M + 1;
						while (x < H && A(Y, x, L.x, L.x + L.colSpan)) (L.rowSpan++, x++);
						let m = new ju(L);
						((m.x = L.x), (m.y = L.y), Z7(`Missing cell at ${m.y}-${m.x}.`), Z(m, Y[M]));
					}
		}
		function J(Y) {
			return Y.map(function (H) {
				if (!Array.isArray(H)) {
					let K = Object.keys(H)[0];
					if (((H = H[K]), Array.isArray(H))) ((H = H.slice()), H.unshift(K));
					else H = [K, H];
				}
				return H.map(function (K) {
					return new ju(K);
				});
			});
		}
		function Q(Y) {
			let H = J(Y);
			return (u(H), z(H), _(H), $(H), H);
		}
		q2.exports = {
			makeTableLayout: Q,
			layoutTable: u,
			addRowSpanCells: _,
			maxWidth: F,
			fillInTable: z,
			computeWidths: R2('colSpan', 'desiredWidth', 'x', 1),
			computeHeights: R2('rowSpan', 'desiredHeight', 'y', 1)
		};
	})();
	function R2(D, u, F, E) {
		return function (B, C) {
			let A = [],
				_ = [],
				$ = {};
			(C.forEach(function (Z) {
				Z.forEach(function (z) {
					if ((z[D] || 1) > 1) _.push(z);
					else A[z[F]] = Math.max(A[z[F]] || 0, z[u] || 0, E);
				});
			}),
				B.forEach(function (Z, z) {
					if (typeof Z === 'number') A[z] = Z;
				}));
			for (let Z = _.length - 1; Z >= 0; Z--) {
				let z = _[Z],
					J = z[D],
					Q = z[F],
					Y = A[Q],
					H = typeof B[Q] === 'number' ? 0 : 1;
				if (typeof Y === 'number') {
					for (let K = 1; K < J; K++) if (((Y += 1 + A[Q + K]), typeof B[Q + K] !== 'number')) H++;
				} else if (((Y = u === 'desiredWidth' ? z.desiredWidth - 1 : 1), !$[Q] || $[Q] < Y))
					$[Q] = Y;
				if (z[u] > Y) {
					let K = 0;
					while (H > 0 && z[u] > Y) {
						if (typeof B[Q + K] !== 'number') {
							let M = Math.round((z[u] - Y) / H);
							((Y += M), (A[Q + K] += M), H--);
						}
						K++;
					}
				}
			}
			Object.assign(B, A, $);
			for (let Z = 0; Z < B.length; Z++) B[Z] = Math.max(E, B[Z] || 0);
		};
	}
});
var N2 = G((W_, V2) => {
	var QD = R0(),
		H7 = Tu(),
		Ou = L2();
	class Su extends Array {
		constructor(D) {
			super();
			let u = H7.mergeOptions(D);
			if ((Object.defineProperty(this, 'options', { value: u, enumerable: u.debug }), u.debug)) {
				switch (typeof u.debug) {
					case 'boolean':
						QD.setDebugLevel(QD.WARN);
						break;
					case 'number':
						QD.setDebugLevel(u.debug);
						break;
					case 'string':
						QD.setDebugLevel(parseInt(u.debug, 10));
						break;
					default:
						(QD.setDebugLevel(QD.WARN),
							QD.warn(
								`Debug option is expected to be boolean, number, or string. Received a ${typeof u.debug}`
							));
				}
				Object.defineProperty(this, 'messages', {
					get() {
						return QD.debugMessages();
					}
				});
			}
		}
		toString() {
			let D = this,
				u = this.options.head && this.options.head.length;
			if (u) {
				if (((D = [this.options.head]), this.length)) D.push.apply(D, this);
			} else this.options.style.head = [];
			let F = Ou.makeTableLayout(D);
			(F.forEach(function (B) {
				B.forEach(function (C) {
					C.mergeTableOptions(this.options, F);
				}, this);
			}, this),
				Ou.computeWidths(this.options.colWidths, F),
				Ou.computeHeights(this.options.rowHeights, F),
				F.forEach(function (B) {
					B.forEach(function (C) {
						C.init(this.options);
					}, this);
				}, this));
			let E = [];
			for (let B = 0; B < F.length; B++) {
				let C = F[B],
					A = this.options.rowHeights[B];
				if (B === 0 || !this.options.style.compact || (B == 1 && u)) Pu(C, 'top', E);
				for (let _ = 0; _ < A; _++) Pu(C, _, E);
				if (B + 1 == F.length) Pu(C, 'bottom', E);
			}
			return E.join(`
`);
		}
		get width() {
			return this.toString().split(`
`)[0].length;
		}
	}
	Su.reset = () => QD.reset();
	function Pu(D, u, F) {
		let E = [];
		D.forEach(function (C) {
			E.push(C.draw(u));
		});
		let B = E.join('');
		if (B.length) F.push(B);
	}
	V2.exports = Su;
});
var f2 = G((h_, T7) => {
	T7.exports = {
		dots: {
			interval: 80,
			frames: [
				'\u280B',
				'\u2819',
				'\u2839',
				'\u2838',
				'\u283C',
				'\u2834',
				'\u2826',
				'\u2827',
				'\u2807',
				'\u280F'
			]
		},
		dots2: {
			interval: 80,
			frames: ['\u28FE', '\u28FD', '\u28FB', '\u28BF', '\u287F', '\u28DF', '\u28EF', '\u28F7']
		},
		dots3: {
			interval: 80,
			frames: [
				'\u280B',
				'\u2819',
				'\u281A',
				'\u281E',
				'\u2816',
				'\u2826',
				'\u2834',
				'\u2832',
				'\u2833',
				'\u2813'
			]
		},
		dots4: {
			interval: 80,
			frames: [
				'\u2804',
				'\u2806',
				'\u2807',
				'\u280B',
				'\u2819',
				'\u2838',
				'\u2830',
				'\u2820',
				'\u2830',
				'\u2838',
				'\u2819',
				'\u280B',
				'\u2807',
				'\u2806'
			]
		},
		dots5: {
			interval: 80,
			frames: [
				'\u280B',
				'\u2819',
				'\u281A',
				'\u2812',
				'\u2802',
				'\u2802',
				'\u2812',
				'\u2832',
				'\u2834',
				'\u2826',
				'\u2816',
				'\u2812',
				'\u2810',
				'\u2810',
				'\u2812',
				'\u2813',
				'\u280B'
			]
		},
		dots6: {
			interval: 80,
			frames: [
				'\u2801',
				'\u2809',
				'\u2819',
				'\u281A',
				'\u2812',
				'\u2802',
				'\u2802',
				'\u2812',
				'\u2832',
				'\u2834',
				'\u2824',
				'\u2804',
				'\u2804',
				'\u2824',
				'\u2834',
				'\u2832',
				'\u2812',
				'\u2802',
				'\u2802',
				'\u2812',
				'\u281A',
				'\u2819',
				'\u2809',
				'\u2801'
			]
		},
		dots7: {
			interval: 80,
			frames: [
				'\u2808',
				'\u2809',
				'\u280B',
				'\u2813',
				'\u2812',
				'\u2810',
				'\u2810',
				'\u2812',
				'\u2816',
				'\u2826',
				'\u2824',
				'\u2820',
				'\u2820',
				'\u2824',
				'\u2826',
				'\u2816',
				'\u2812',
				'\u2810',
				'\u2810',
				'\u2812',
				'\u2813',
				'\u280B',
				'\u2809',
				'\u2808'
			]
		},
		dots8: {
			interval: 80,
			frames: [
				'\u2801',
				'\u2801',
				'\u2809',
				'\u2819',
				'\u281A',
				'\u2812',
				'\u2802',
				'\u2802',
				'\u2812',
				'\u2832',
				'\u2834',
				'\u2824',
				'\u2804',
				'\u2804',
				'\u2824',
				'\u2820',
				'\u2820',
				'\u2824',
				'\u2826',
				'\u2816',
				'\u2812',
				'\u2810',
				'\u2810',
				'\u2812',
				'\u2813',
				'\u280B',
				'\u2809',
				'\u2808',
				'\u2808'
			]
		},
		dots9: {
			interval: 80,
			frames: ['\u28B9', '\u28BA', '\u28BC', '\u28F8', '\u28C7', '\u2867', '\u2857', '\u284F']
		},
		dots10: {
			interval: 80,
			frames: ['\u2884', '\u2882', '\u2881', '\u2841', '\u2848', '\u2850', '\u2860']
		},
		dots11: {
			interval: 100,
			frames: ['\u2801', '\u2802', '\u2804', '\u2840', '\u2880', '\u2820', '\u2810', '\u2808']
		},
		dots12: {
			interval: 80,
			frames: [
				'\u2880\u2800',
				'\u2840\u2800',
				'\u2804\u2800',
				'\u2882\u2800',
				'\u2842\u2800',
				'\u2805\u2800',
				'\u2883\u2800',
				'\u2843\u2800',
				'\u280D\u2800',
				'\u288B\u2800',
				'\u284B\u2800',
				'\u280D\u2801',
				'\u288B\u2801',
				'\u284B\u2801',
				'\u280D\u2809',
				'\u280B\u2809',
				'\u280B\u2809',
				'\u2809\u2819',
				'\u2809\u2819',
				'\u2809\u2829',
				'\u2808\u2899',
				'\u2808\u2859',
				'\u2888\u2829',
				'\u2840\u2899',
				'\u2804\u2859',
				'\u2882\u2829',
				'\u2842\u2898',
				'\u2805\u2858',
				'\u2883\u2828',
				'\u2843\u2890',
				'\u280D\u2850',
				'\u288B\u2820',
				'\u284B\u2880',
				'\u280D\u2841',
				'\u288B\u2801',
				'\u284B\u2801',
				'\u280D\u2809',
				'\u280B\u2809',
				'\u280B\u2809',
				'\u2809\u2819',
				'\u2809\u2819',
				'\u2809\u2829',
				'\u2808\u2899',
				'\u2808\u2859',
				'\u2808\u2829',
				'\u2800\u2899',
				'\u2800\u2859',
				'\u2800\u2829',
				'\u2800\u2898',
				'\u2800\u2858',
				'\u2800\u2828',
				'\u2800\u2890',
				'\u2800\u2850',
				'\u2800\u2820',
				'\u2800\u2880',
				'\u2800\u2840'
			]
		},
		dots13: {
			interval: 80,
			frames: ['\u28FC', '\u28F9', '\u28BB', '\u283F', '\u285F', '\u28CF', '\u28E7', '\u28F6']
		},
		dots8Bit: {
			interval: 80,
			frames: [
				'\u2800',
				'\u2801',
				'\u2802',
				'\u2803',
				'\u2804',
				'\u2805',
				'\u2806',
				'\u2807',
				'\u2840',
				'\u2841',
				'\u2842',
				'\u2843',
				'\u2844',
				'\u2845',
				'\u2846',
				'\u2847',
				'\u2808',
				'\u2809',
				'\u280A',
				'\u280B',
				'\u280C',
				'\u280D',
				'\u280E',
				'\u280F',
				'\u2848',
				'\u2849',
				'\u284A',
				'\u284B',
				'\u284C',
				'\u284D',
				'\u284E',
				'\u284F',
				'\u2810',
				'\u2811',
				'\u2812',
				'\u2813',
				'\u2814',
				'\u2815',
				'\u2816',
				'\u2817',
				'\u2850',
				'\u2851',
				'\u2852',
				'\u2853',
				'\u2854',
				'\u2855',
				'\u2856',
				'\u2857',
				'\u2818',
				'\u2819',
				'\u281A',
				'\u281B',
				'\u281C',
				'\u281D',
				'\u281E',
				'\u281F',
				'\u2858',
				'\u2859',
				'\u285A',
				'\u285B',
				'\u285C',
				'\u285D',
				'\u285E',
				'\u285F',
				'\u2820',
				'\u2821',
				'\u2822',
				'\u2823',
				'\u2824',
				'\u2825',
				'\u2826',
				'\u2827',
				'\u2860',
				'\u2861',
				'\u2862',
				'\u2863',
				'\u2864',
				'\u2865',
				'\u2866',
				'\u2867',
				'\u2828',
				'\u2829',
				'\u282A',
				'\u282B',
				'\u282C',
				'\u282D',
				'\u282E',
				'\u282F',
				'\u2868',
				'\u2869',
				'\u286A',
				'\u286B',
				'\u286C',
				'\u286D',
				'\u286E',
				'\u286F',
				'\u2830',
				'\u2831',
				'\u2832',
				'\u2833',
				'\u2834',
				'\u2835',
				'\u2836',
				'\u2837',
				'\u2870',
				'\u2871',
				'\u2872',
				'\u2873',
				'\u2874',
				'\u2875',
				'\u2876',
				'\u2877',
				'\u2838',
				'\u2839',
				'\u283A',
				'\u283B',
				'\u283C',
				'\u283D',
				'\u283E',
				'\u283F',
				'\u2878',
				'\u2879',
				'\u287A',
				'\u287B',
				'\u287C',
				'\u287D',
				'\u287E',
				'\u287F',
				'\u2880',
				'\u2881',
				'\u2882',
				'\u2883',
				'\u2884',
				'\u2885',
				'\u2886',
				'\u2887',
				'\u28C0',
				'\u28C1',
				'\u28C2',
				'\u28C3',
				'\u28C4',
				'\u28C5',
				'\u28C6',
				'\u28C7',
				'\u2888',
				'\u2889',
				'\u288A',
				'\u288B',
				'\u288C',
				'\u288D',
				'\u288E',
				'\u288F',
				'\u28C8',
				'\u28C9',
				'\u28CA',
				'\u28CB',
				'\u28CC',
				'\u28CD',
				'\u28CE',
				'\u28CF',
				'\u2890',
				'\u2891',
				'\u2892',
				'\u2893',
				'\u2894',
				'\u2895',
				'\u2896',
				'\u2897',
				'\u28D0',
				'\u28D1',
				'\u28D2',
				'\u28D3',
				'\u28D4',
				'\u28D5',
				'\u28D6',
				'\u28D7',
				'\u2898',
				'\u2899',
				'\u289A',
				'\u289B',
				'\u289C',
				'\u289D',
				'\u289E',
				'\u289F',
				'\u28D8',
				'\u28D9',
				'\u28DA',
				'\u28DB',
				'\u28DC',
				'\u28DD',
				'\u28DE',
				'\u28DF',
				'\u28A0',
				'\u28A1',
				'\u28A2',
				'\u28A3',
				'\u28A4',
				'\u28A5',
				'\u28A6',
				'\u28A7',
				'\u28E0',
				'\u28E1',
				'\u28E2',
				'\u28E3',
				'\u28E4',
				'\u28E5',
				'\u28E6',
				'\u28E7',
				'\u28A8',
				'\u28A9',
				'\u28AA',
				'\u28AB',
				'\u28AC',
				'\u28AD',
				'\u28AE',
				'\u28AF',
				'\u28E8',
				'\u28E9',
				'\u28EA',
				'\u28EB',
				'\u28EC',
				'\u28ED',
				'\u28EE',
				'\u28EF',
				'\u28B0',
				'\u28B1',
				'\u28B2',
				'\u28B3',
				'\u28B4',
				'\u28B5',
				'\u28B6',
				'\u28B7',
				'\u28F0',
				'\u28F1',
				'\u28F2',
				'\u28F3',
				'\u28F4',
				'\u28F5',
				'\u28F6',
				'\u28F7',
				'\u28B8',
				'\u28B9',
				'\u28BA',
				'\u28BB',
				'\u28BC',
				'\u28BD',
				'\u28BE',
				'\u28BF',
				'\u28F8',
				'\u28F9',
				'\u28FA',
				'\u28FB',
				'\u28FC',
				'\u28FD',
				'\u28FE',
				'\u28FF'
			]
		},
		sand: {
			interval: 80,
			frames: [
				'\u2801',
				'\u2802',
				'\u2804',
				'\u2840',
				'\u2848',
				'\u2850',
				'\u2860',
				'\u28C0',
				'\u28C1',
				'\u28C2',
				'\u28C4',
				'\u28CC',
				'\u28D4',
				'\u28E4',
				'\u28E5',
				'\u28E6',
				'\u28EE',
				'\u28F6',
				'\u28F7',
				'\u28FF',
				'\u287F',
				'\u283F',
				'\u289F',
				'\u281F',
				'\u285B',
				'\u281B',
				'\u282B',
				'\u288B',
				'\u280B',
				'\u280D',
				'\u2849',
				'\u2809',
				'\u2811',
				'\u2821',
				'\u2881'
			]
		},
		line: { interval: 130, frames: ['-', '\\', '|', '/'] },
		line2: { interval: 100, frames: ['\u2802', '-', '\u2013', '\u2014', '\u2013', '-'] },
		pipe: {
			interval: 100,
			frames: ['\u2524', '\u2518', '\u2534', '\u2514', '\u251C', '\u250C', '\u252C', '\u2510']
		},
		simpleDots: { interval: 400, frames: ['.  ', '.. ', '...', '   '] },
		simpleDotsScrolling: { interval: 200, frames: ['.  ', '.. ', '...', ' ..', '  .', '   '] },
		star: { interval: 70, frames: ['\u2736', '\u2738', '\u2739', '\u273A', '\u2739', '\u2737'] },
		star2: { interval: 80, frames: ['+', 'x', '*'] },
		flip: { interval: 70, frames: ['_', '_', '_', '-', '`', '`', "'", '\xB4', '-', '_', '_', '_'] },
		hamburger: { interval: 100, frames: ['\u2631', '\u2632', '\u2634'] },
		growVertical: {
			interval: 120,
			frames: [
				'\u2581',
				'\u2583',
				'\u2584',
				'\u2585',
				'\u2586',
				'\u2587',
				'\u2586',
				'\u2585',
				'\u2584',
				'\u2583'
			]
		},
		growHorizontal: {
			interval: 120,
			frames: [
				'\u258F',
				'\u258E',
				'\u258D',
				'\u258C',
				'\u258B',
				'\u258A',
				'\u2589',
				'\u258A',
				'\u258B',
				'\u258C',
				'\u258D',
				'\u258E'
			]
		},
		balloon: { interval: 140, frames: [' ', '.', 'o', 'O', '@', '*', ' '] },
		balloon2: { interval: 120, frames: ['.', 'o', 'O', '\xB0', 'O', 'o', '.'] },
		noise: { interval: 100, frames: ['\u2593', '\u2592', '\u2591'] },
		bounce: { interval: 120, frames: ['\u2801', '\u2802', '\u2804', '\u2802'] },
		boxBounce: { interval: 120, frames: ['\u2596', '\u2598', '\u259D', '\u2597'] },
		boxBounce2: { interval: 100, frames: ['\u258C', '\u2580', '\u2590', '\u2584'] },
		triangle: { interval: 50, frames: ['\u25E2', '\u25E3', '\u25E4', '\u25E5'] },
		binary: {
			interval: 80,
			frames: [
				'010010',
				'001100',
				'100101',
				'111010',
				'111101',
				'010111',
				'101011',
				'111000',
				'110011',
				'110101'
			]
		},
		arc: { interval: 100, frames: ['\u25DC', '\u25E0', '\u25DD', '\u25DE', '\u25E1', '\u25DF'] },
		circle: { interval: 120, frames: ['\u25E1', '\u2299', '\u25E0'] },
		squareCorners: { interval: 180, frames: ['\u25F0', '\u25F3', '\u25F2', '\u25F1'] },
		circleQuarters: { interval: 120, frames: ['\u25F4', '\u25F7', '\u25F6', '\u25F5'] },
		circleHalves: { interval: 50, frames: ['\u25D0', '\u25D3', '\u25D1', '\u25D2'] },
		squish: { interval: 100, frames: ['\u256B', '\u256A'] },
		toggle: { interval: 250, frames: ['\u22B6', '\u22B7'] },
		toggle2: { interval: 80, frames: ['\u25AB', '\u25AA'] },
		toggle3: { interval: 120, frames: ['\u25A1', '\u25A0'] },
		toggle4: { interval: 100, frames: ['\u25A0', '\u25A1', '\u25AA', '\u25AB'] },
		toggle5: { interval: 100, frames: ['\u25AE', '\u25AF'] },
		toggle6: { interval: 300, frames: ['\u101D', '\u1040'] },
		toggle7: { interval: 80, frames: ['\u29BE', '\u29BF'] },
		toggle8: { interval: 100, frames: ['\u25CD', '\u25CC'] },
		toggle9: { interval: 100, frames: ['\u25C9', '\u25CE'] },
		toggle10: { interval: 100, frames: ['\u3282', '\u3280', '\u3281'] },
		toggle11: { interval: 50, frames: ['\u29C7', '\u29C6'] },
		toggle12: { interval: 120, frames: ['\u2617', '\u2616'] },
		toggle13: { interval: 80, frames: ['=', '*', '-'] },
		arrow: {
			interval: 100,
			frames: ['\u2190', '\u2196', '\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199']
		},
		arrow2: {
			interval: 80,
			frames: [
				'\u2B06\uFE0F ',
				'\u2197\uFE0F ',
				'\u27A1\uFE0F ',
				'\u2198\uFE0F ',
				'\u2B07\uFE0F ',
				'\u2199\uFE0F ',
				'\u2B05\uFE0F ',
				'\u2196\uFE0F '
			]
		},
		arrow3: {
			interval: 120,
			frames: [
				'\u25B9\u25B9\u25B9\u25B9\u25B9',
				'\u25B8\u25B9\u25B9\u25B9\u25B9',
				'\u25B9\u25B8\u25B9\u25B9\u25B9',
				'\u25B9\u25B9\u25B8\u25B9\u25B9',
				'\u25B9\u25B9\u25B9\u25B8\u25B9',
				'\u25B9\u25B9\u25B9\u25B9\u25B8'
			]
		},
		bouncingBar: {
			interval: 80,
			frames: [
				'[    ]',
				'[=   ]',
				'[==  ]',
				'[=== ]',
				'[====]',
				'[ ===]',
				'[  ==]',
				'[   =]',
				'[    ]',
				'[   =]',
				'[  ==]',
				'[ ===]',
				'[====]',
				'[=== ]',
				'[==  ]',
				'[=   ]'
			]
		},
		bouncingBall: {
			interval: 80,
			frames: [
				'( \u25CF    )',
				'(  \u25CF   )',
				'(   \u25CF  )',
				'(    \u25CF )',
				'(     \u25CF)',
				'(    \u25CF )',
				'(   \u25CF  )',
				'(  \u25CF   )',
				'( \u25CF    )',
				'(\u25CF     )'
			]
		},
		smiley: { interval: 200, frames: ['\uD83D\uDE04 ', '\uD83D\uDE1D '] },
		monkey: {
			interval: 300,
			frames: ['\uD83D\uDE48 ', '\uD83D\uDE48 ', '\uD83D\uDE49 ', '\uD83D\uDE4A ']
		},
		hearts: {
			interval: 100,
			frames: ['\uD83D\uDC9B ', '\uD83D\uDC99 ', '\uD83D\uDC9C ', '\uD83D\uDC9A ', '\u2764\uFE0F ']
		},
		clock: {
			interval: 100,
			frames: [
				'\uD83D\uDD5B ',
				'\uD83D\uDD50 ',
				'\uD83D\uDD51 ',
				'\uD83D\uDD52 ',
				'\uD83D\uDD53 ',
				'\uD83D\uDD54 ',
				'\uD83D\uDD55 ',
				'\uD83D\uDD56 ',
				'\uD83D\uDD57 ',
				'\uD83D\uDD58 ',
				'\uD83D\uDD59 ',
				'\uD83D\uDD5A '
			]
		},
		earth: { interval: 180, frames: ['\uD83C\uDF0D ', '\uD83C\uDF0E ', '\uD83C\uDF0F '] },
		material: {
			interval: 17,
			frames: [
				'\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588',
				'\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588',
				'\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588',
				'\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588',
				'\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588',
				'\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588',
				'\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588',
				'\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2588',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581',
				'\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581\u2581'
			]
		},
		moon: {
			interval: 80,
			frames: [
				'\uD83C\uDF11 ',
				'\uD83C\uDF12 ',
				'\uD83C\uDF13 ',
				'\uD83C\uDF14 ',
				'\uD83C\uDF15 ',
				'\uD83C\uDF16 ',
				'\uD83C\uDF17 ',
				'\uD83C\uDF18 '
			]
		},
		runner: { interval: 140, frames: ['\uD83D\uDEB6 ', '\uD83C\uDFC3 '] },
		pong: {
			interval: 80,
			frames: [
				'\u2590\u2802       \u258C',
				'\u2590\u2808       \u258C',
				'\u2590 \u2802      \u258C',
				'\u2590 \u2820      \u258C',
				'\u2590  \u2840     \u258C',
				'\u2590  \u2820     \u258C',
				'\u2590   \u2802    \u258C',
				'\u2590   \u2808    \u258C',
				'\u2590    \u2802   \u258C',
				'\u2590    \u2820   \u258C',
				'\u2590     \u2840  \u258C',
				'\u2590     \u2820  \u258C',
				'\u2590      \u2802 \u258C',
				'\u2590      \u2808 \u258C',
				'\u2590       \u2802\u258C',
				'\u2590       \u2820\u258C',
				'\u2590       \u2840\u258C',
				'\u2590      \u2820 \u258C',
				'\u2590      \u2802 \u258C',
				'\u2590     \u2808  \u258C',
				'\u2590     \u2802  \u258C',
				'\u2590    \u2820   \u258C',
				'\u2590    \u2840   \u258C',
				'\u2590   \u2820    \u258C',
				'\u2590   \u2802    \u258C',
				'\u2590  \u2808     \u258C',
				'\u2590  \u2802     \u258C',
				'\u2590 \u2820      \u258C',
				'\u2590 \u2840      \u258C',
				'\u2590\u2820       \u258C'
			]
		},
		shark: {
			interval: 120,
			frames: [
				'\u2590|\\____________\u258C',
				'\u2590_|\\___________\u258C',
				'\u2590__|\\__________\u258C',
				'\u2590___|\\_________\u258C',
				'\u2590____|\\________\u258C',
				'\u2590_____|\\_______\u258C',
				'\u2590______|\\______\u258C',
				'\u2590_______|\\_____\u258C',
				'\u2590________|\\____\u258C',
				'\u2590_________|\\___\u258C',
				'\u2590__________|\\__\u258C',
				'\u2590___________|\\_\u258C',
				'\u2590____________|\\\u258C',
				'\u2590____________/|\u258C',
				'\u2590___________/|_\u258C',
				'\u2590__________/|__\u258C',
				'\u2590_________/|___\u258C',
				'\u2590________/|____\u258C',
				'\u2590_______/|_____\u258C',
				'\u2590______/|______\u258C',
				'\u2590_____/|_______\u258C',
				'\u2590____/|________\u258C',
				'\u2590___/|_________\u258C',
				'\u2590__/|__________\u258C',
				'\u2590_/|___________\u258C',
				'\u2590/|____________\u258C'
			]
		},
		dqpb: { interval: 100, frames: ['d', 'q', 'p', 'b'] },
		weather: {
			interval: 100,
			frames: [
				'\u2600\uFE0F ',
				'\u2600\uFE0F ',
				'\u2600\uFE0F ',
				'\uD83C\uDF24 ',
				'\u26C5\uFE0F ',
				'\uD83C\uDF25 ',
				'\u2601\uFE0F ',
				'\uD83C\uDF27 ',
				'\uD83C\uDF28 ',
				'\uD83C\uDF27 ',
				'\uD83C\uDF28 ',
				'\uD83C\uDF27 ',
				'\uD83C\uDF28 ',
				'\u26C8 ',
				'\uD83C\uDF28 ',
				'\uD83C\uDF27 ',
				'\uD83C\uDF28 ',
				'\u2601\uFE0F ',
				'\uD83C\uDF25 ',
				'\u26C5\uFE0F ',
				'\uD83C\uDF24 ',
				'\u2600\uFE0F ',
				'\u2600\uFE0F '
			]
		},
		christmas: { interval: 400, frames: ['\uD83C\uDF32', '\uD83C\uDF84'] },
		grenade: {
			interval: 80,
			frames: [
				'\u060C  ',
				'\u2032  ',
				' \xB4 ',
				' \u203E ',
				'  \u2E0C',
				'  \u2E0A',
				'  |',
				'  \u204E',
				'  \u2055',
				' \u0DF4 ',
				'  \u2053',
				'   ',
				'   ',
				'   '
			]
		},
		point: {
			interval: 125,
			frames: [
				'\u2219\u2219\u2219',
				'\u25CF\u2219\u2219',
				'\u2219\u25CF\u2219',
				'\u2219\u2219\u25CF',
				'\u2219\u2219\u2219'
			]
		},
		layer: { interval: 150, frames: ['-', '=', '\u2261'] },
		betaWave: {
			interval: 80,
			frames: [
				'\u03C1\u03B2\u03B2\u03B2\u03B2\u03B2\u03B2',
				'\u03B2\u03C1\u03B2\u03B2\u03B2\u03B2\u03B2',
				'\u03B2\u03B2\u03C1\u03B2\u03B2\u03B2\u03B2',
				'\u03B2\u03B2\u03B2\u03C1\u03B2\u03B2\u03B2',
				'\u03B2\u03B2\u03B2\u03B2\u03C1\u03B2\u03B2',
				'\u03B2\u03B2\u03B2\u03B2\u03B2\u03C1\u03B2',
				'\u03B2\u03B2\u03B2\u03B2\u03B2\u03B2\u03C1'
			]
		},
		fingerDance: {
			interval: 160,
			frames: [
				'\uD83E\uDD18 ',
				'\uD83E\uDD1F ',
				'\uD83D\uDD96 ',
				'\u270B ',
				'\uD83E\uDD1A ',
				'\uD83D\uDC46 '
			]
		},
		fistBump: {
			interval: 80,
			frames: [
				'\uD83E\uDD1C\u3000\u3000\u3000\u3000\uD83E\uDD1B ',
				'\uD83E\uDD1C\u3000\u3000\u3000\u3000\uD83E\uDD1B ',
				'\uD83E\uDD1C\u3000\u3000\u3000\u3000\uD83E\uDD1B ',
				'\u3000\uD83E\uDD1C\u3000\u3000\uD83E\uDD1B\u3000 ',
				'\u3000\u3000\uD83E\uDD1C\uD83E\uDD1B\u3000\u3000 ',
				'\u3000\uD83E\uDD1C\u2728\uD83E\uDD1B\u3000\u3000 ',
				'\uD83E\uDD1C\u3000\u2728\u3000\uD83E\uDD1B\u3000 '
			]
		},
		soccerHeader: {
			interval: 80,
			frames: [
				' \uD83E\uDDD1\u26BD\uFE0F       \uD83E\uDDD1 ',
				'\uD83E\uDDD1  \u26BD\uFE0F      \uD83E\uDDD1 ',
				'\uD83E\uDDD1   \u26BD\uFE0F     \uD83E\uDDD1 ',
				'\uD83E\uDDD1    \u26BD\uFE0F    \uD83E\uDDD1 ',
				'\uD83E\uDDD1     \u26BD\uFE0F   \uD83E\uDDD1 ',
				'\uD83E\uDDD1      \u26BD\uFE0F  \uD83E\uDDD1 ',
				'\uD83E\uDDD1       \u26BD\uFE0F\uD83E\uDDD1  ',
				'\uD83E\uDDD1      \u26BD\uFE0F  \uD83E\uDDD1 ',
				'\uD83E\uDDD1     \u26BD\uFE0F   \uD83E\uDDD1 ',
				'\uD83E\uDDD1    \u26BD\uFE0F    \uD83E\uDDD1 ',
				'\uD83E\uDDD1   \u26BD\uFE0F     \uD83E\uDDD1 ',
				'\uD83E\uDDD1  \u26BD\uFE0F      \uD83E\uDDD1 '
			]
		},
		mindblown: {
			interval: 160,
			frames: [
				'\uD83D\uDE10 ',
				'\uD83D\uDE10 ',
				'\uD83D\uDE2E ',
				'\uD83D\uDE2E ',
				'\uD83D\uDE26 ',
				'\uD83D\uDE26 ',
				'\uD83D\uDE27 ',
				'\uD83D\uDE27 ',
				'\uD83E\uDD2F ',
				'\uD83D\uDCA5 ',
				'\u2728 ',
				'\u3000 ',
				'\u3000 ',
				'\u3000 '
			]
		},
		speaker: {
			interval: 160,
			frames: ['\uD83D\uDD08 ', '\uD83D\uDD09 ', '\uD83D\uDD0A ', '\uD83D\uDD09 ']
		},
		orangePulse: {
			interval: 100,
			frames: ['\uD83D\uDD38 ', '\uD83D\uDD36 ', '\uD83D\uDFE0 ', '\uD83D\uDFE0 ', '\uD83D\uDD36 ']
		},
		bluePulse: {
			interval: 100,
			frames: ['\uD83D\uDD39 ', '\uD83D\uDD37 ', '\uD83D\uDD35 ', '\uD83D\uDD35 ', '\uD83D\uDD37 ']
		},
		orangeBluePulse: {
			interval: 100,
			frames: [
				'\uD83D\uDD38 ',
				'\uD83D\uDD36 ',
				'\uD83D\uDFE0 ',
				'\uD83D\uDFE0 ',
				'\uD83D\uDD36 ',
				'\uD83D\uDD39 ',
				'\uD83D\uDD37 ',
				'\uD83D\uDD35 ',
				'\uD83D\uDD35 ',
				'\uD83D\uDD37 '
			]
		},
		timeTravel: {
			interval: 100,
			frames: [
				'\uD83D\uDD5B ',
				'\uD83D\uDD5A ',
				'\uD83D\uDD59 ',
				'\uD83D\uDD58 ',
				'\uD83D\uDD57 ',
				'\uD83D\uDD56 ',
				'\uD83D\uDD55 ',
				'\uD83D\uDD54 ',
				'\uD83D\uDD53 ',
				'\uD83D\uDD52 ',
				'\uD83D\uDD51 ',
				'\uD83D\uDD50 '
			]
		},
		aesthetic: {
			interval: 80,
			frames: [
				'\u25B0\u25B1\u25B1\u25B1\u25B1\u25B1\u25B1',
				'\u25B0\u25B0\u25B1\u25B1\u25B1\u25B1\u25B1',
				'\u25B0\u25B0\u25B0\u25B1\u25B1\u25B1\u25B1',
				'\u25B0\u25B0\u25B0\u25B0\u25B1\u25B1\u25B1',
				'\u25B0\u25B0\u25B0\u25B0\u25B0\u25B1\u25B1',
				'\u25B0\u25B0\u25B0\u25B0\u25B0\u25B0\u25B1',
				'\u25B0\u25B0\u25B0\u25B0\u25B0\u25B0\u25B0',
				'\u25B0\u25B1\u25B1\u25B1\u25B1\u25B1\u25B1'
			]
		},
		dwarfFortress: {
			interval: 80,
			frames: [
				' \u2588\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A\u2588\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A\u2588\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A\u2593\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A\u2593\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A\u2592\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A\u2592\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A\u2591\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A\u2591\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'\u263A \u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A\u2593\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A\u2593\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A\u2592\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A\u2592\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A\u2591\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A\u2591\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u263A \u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A\u2593\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A\u2593\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A\u2592\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A\u2592\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A\u2591\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A\u2591\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u263A \u2588\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A\u2593\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A\u2593\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A\u2592\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A\u2592\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A\u2591\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A\u2591\u2588\u2588\xA3\xA3\xA3  ',
				'   \u263A \u2588\u2588\xA3\xA3\xA3  ',
				'    \u263A\u2588\u2588\xA3\xA3\xA3  ',
				'    \u263A\u2588\u2588\xA3\xA3\xA3  ',
				'    \u263A\u2593\u2588\xA3\xA3\xA3  ',
				'    \u263A\u2593\u2588\xA3\xA3\xA3  ',
				'    \u263A\u2592\u2588\xA3\xA3\xA3  ',
				'    \u263A\u2592\u2588\xA3\xA3\xA3  ',
				'    \u263A\u2591\u2588\xA3\xA3\xA3  ',
				'    \u263A\u2591\u2588\xA3\xA3\xA3  ',
				'    \u263A \u2588\xA3\xA3\xA3  ',
				'     \u263A\u2588\xA3\xA3\xA3  ',
				'     \u263A\u2588\xA3\xA3\xA3  ',
				'     \u263A\u2593\xA3\xA3\xA3  ',
				'     \u263A\u2593\xA3\xA3\xA3  ',
				'     \u263A\u2592\xA3\xA3\xA3  ',
				'     \u263A\u2592\xA3\xA3\xA3  ',
				'     \u263A\u2591\xA3\xA3\xA3  ',
				'     \u263A\u2591\xA3\xA3\xA3  ',
				'     \u263A \xA3\xA3\xA3  ',
				'      \u263A\xA3\xA3\xA3  ',
				'      \u263A\xA3\xA3\xA3  ',
				'      \u263A\u2593\xA3\xA3  ',
				'      \u263A\u2593\xA3\xA3  ',
				'      \u263A\u2592\xA3\xA3  ',
				'      \u263A\u2592\xA3\xA3  ',
				'      \u263A\u2591\xA3\xA3  ',
				'      \u263A\u2591\xA3\xA3  ',
				'      \u263A \xA3\xA3  ',
				'       \u263A\xA3\xA3  ',
				'       \u263A\xA3\xA3  ',
				'       \u263A\u2593\xA3  ',
				'       \u263A\u2593\xA3  ',
				'       \u263A\u2592\xA3  ',
				'       \u263A\u2592\xA3  ',
				'       \u263A\u2591\xA3  ',
				'       \u263A\u2591\xA3  ',
				'       \u263A \xA3  ',
				'        \u263A\xA3  ',
				'        \u263A\xA3  ',
				'        \u263A\u2593  ',
				'        \u263A\u2593  ',
				'        \u263A\u2592  ',
				'        \u263A\u2592  ',
				'        \u263A\u2591  ',
				'        \u263A\u2591  ',
				'        \u263A   ',
				'        \u263A  &',
				'        \u263A \u263C&',
				'       \u263A \u263C &',
				'       \u263A\u263C  &',
				'      \u263A\u263C  & ',
				'      \u203C   & ',
				'     \u263A   &  ',
				'    \u203C    &  ',
				'   \u263A    &   ',
				'  \u203C     &   ',
				' \u263A     &    ',
				'\u203C      &    ',
				'      &     ',
				'      &     ',
				'     &   \u2591  ',
				'     &   \u2592  ',
				'    &    \u2593  ',
				'    &    \xA3  ',
				'   &    \u2591\xA3  ',
				'   &    \u2592\xA3  ',
				'  &     \u2593\xA3  ',
				'  &     \xA3\xA3  ',
				' &     \u2591\xA3\xA3  ',
				' &     \u2592\xA3\xA3  ',
				'&      \u2593\xA3\xA3  ',
				'&      \xA3\xA3\xA3  ',
				'      \u2591\xA3\xA3\xA3  ',
				'      \u2592\xA3\xA3\xA3  ',
				'      \u2593\xA3\xA3\xA3  ',
				'      \u2588\xA3\xA3\xA3  ',
				'     \u2591\u2588\xA3\xA3\xA3  ',
				'     \u2592\u2588\xA3\xA3\xA3  ',
				'     \u2593\u2588\xA3\xA3\xA3  ',
				'     \u2588\u2588\xA3\xA3\xA3  ',
				'    \u2591\u2588\u2588\xA3\xA3\xA3  ',
				'    \u2592\u2588\u2588\xA3\xA3\xA3  ',
				'    \u2593\u2588\u2588\xA3\xA3\xA3  ',
				'    \u2588\u2588\u2588\xA3\xA3\xA3  ',
				'   \u2591\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'   \u2592\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'   \u2593\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'   \u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u2591\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u2592\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u2593\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				'  \u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u2591\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u2592\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u2593\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u2588\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  ',
				' \u2588\u2588\u2588\u2588\u2588\u2588\xA3\xA3\xA3  '
			]
		}
	};
});
var hu = G((f_, m2) => {
	var P0 = Object.assign({}, f2()),
		g2 = Object.keys(P0);
	Object.defineProperty(P0, 'random', {
		get() {
			let D = Math.floor(Math.random() * g2.length),
				u = g2[D];
			return P0[u];
		}
	});
	m2.exports = P0;
});
var S = G((I$, D3) => {
	var { FORCE_COLOR: g7, NODE_DISABLE_COLORS: m7, TERM: d7 } = process.env,
		T = {
			enabled: !m7 && d7 !== 'dumb' && g7 !== '0',
			reset: j(0, 0),
			bold: j(1, 22),
			dim: j(2, 22),
			italic: j(3, 23),
			underline: j(4, 24),
			inverse: j(7, 27),
			hidden: j(8, 28),
			strikethrough: j(9, 29),
			black: j(30, 39),
			red: j(31, 39),
			green: j(32, 39),
			yellow: j(33, 39),
			blue: j(34, 39),
			magenta: j(35, 39),
			cyan: j(36, 39),
			white: j(37, 39),
			gray: j(90, 39),
			grey: j(90, 39),
			bgBlack: j(40, 49),
			bgRed: j(41, 49),
			bgGreen: j(42, 49),
			bgYellow: j(43, 49),
			bgBlue: j(44, 49),
			bgMagenta: j(45, 49),
			bgCyan: j(46, 49),
			bgWhite: j(47, 49)
		};
	function e2(D, u) {
		let F = 0,
			E,
			B = '',
			C = '';
		for (; F < D.length; F++)
			if (((E = D[F]), (B += E.open), (C += E.close), u.includes(E.close)))
				u = u.replace(E.rgx, E.close + E.open);
		return B + u + C;
	}
	function c7(D, u) {
		let F = { has: D, keys: u };
		return (
			(F.reset = T.reset.bind(F)),
			(F.bold = T.bold.bind(F)),
			(F.dim = T.dim.bind(F)),
			(F.italic = T.italic.bind(F)),
			(F.underline = T.underline.bind(F)),
			(F.inverse = T.inverse.bind(F)),
			(F.hidden = T.hidden.bind(F)),
			(F.strikethrough = T.strikethrough.bind(F)),
			(F.black = T.black.bind(F)),
			(F.red = T.red.bind(F)),
			(F.green = T.green.bind(F)),
			(F.yellow = T.yellow.bind(F)),
			(F.blue = T.blue.bind(F)),
			(F.magenta = T.magenta.bind(F)),
			(F.cyan = T.cyan.bind(F)),
			(F.white = T.white.bind(F)),
			(F.gray = T.gray.bind(F)),
			(F.grey = T.grey.bind(F)),
			(F.bgBlack = T.bgBlack.bind(F)),
			(F.bgRed = T.bgRed.bind(F)),
			(F.bgGreen = T.bgGreen.bind(F)),
			(F.bgYellow = T.bgYellow.bind(F)),
			(F.bgBlue = T.bgBlue.bind(F)),
			(F.bgMagenta = T.bgMagenta.bind(F)),
			(F.bgCyan = T.bgCyan.bind(F)),
			(F.bgWhite = T.bgWhite.bind(F)),
			F
		);
	}
	function j(D, u) {
		let F = { open: `\x1B[${D}m`, close: `\x1B[${u}m`, rgx: new RegExp(`\\x1b\\[${u}m`, 'g') };
		return function (E) {
			if (this !== void 0 && this.has !== void 0)
				return (
					this.has.includes(D) || (this.has.push(D), this.keys.push(F)),
					E === void 0 ? this : T.enabled ? e2(this.keys, E + '') : E + ''
				);
			return E === void 0 ? c7([D], [F]) : T.enabled ? e2([F], E + '') : E + '';
		};
	}
	D3.exports = T;
});
var F3 = G((j$, u3) => {
	u3.exports = (D, u) => {
		if (D.meta && D.name !== 'escape') return;
		if (D.ctrl) {
			if (D.name === 'a') return 'first';
			if (D.name === 'c') return 'abort';
			if (D.name === 'd') return 'abort';
			if (D.name === 'e') return 'last';
			if (D.name === 'g') return 'reset';
		}
		if (u) {
			if (D.name === 'j') return 'down';
			if (D.name === 'k') return 'up';
		}
		if (D.name === 'return') return 'submit';
		if (D.name === 'enter') return 'submit';
		if (D.name === 'backspace') return 'delete';
		if (D.name === 'delete') return 'deleteForward';
		if (D.name === 'abort') return 'abort';
		if (D.name === 'escape') return 'exit';
		if (D.name === 'tab') return 'next';
		if (D.name === 'pagedown') return 'nextPage';
		if (D.name === 'pageup') return 'prevPage';
		if (D.name === 'home') return 'home';
		if (D.name === 'end') return 'end';
		if (D.name === 'up') return 'up';
		if (D.name === 'down') return 'down';
		if (D.name === 'right') return 'right';
		if (D.name === 'left') return 'left';
		return !1;
	};
});
var b0 = G((O$, E3) => {
	E3.exports = (D) => {
		let u = [
				'[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
				'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
			].join('|'),
			F = new RegExp(u, 'g');
		return typeof D === 'string' ? D.replace(F, '') : D;
	};
});
var w = G((P$, B3) => {
	var au = {
			to(D, u) {
				if (!u) return `\x1B[${D + 1}G`;
				return `\x1B[${u + 1};${D + 1}H`;
			},
			move(D, u) {
				let F = '';
				if (D < 0) F += `\x1B[${-D}D`;
				else if (D > 0) F += `\x1B[${D}C`;
				if (u < 0) F += `\x1B[${-u}A`;
				else if (u > 0) F += `\x1B[${u}B`;
				return F;
			},
			up: (D = 1) => `\x1B[${D}A`,
			down: (D = 1) => `\x1B[${D}B`,
			forward: (D = 1) => `\x1B[${D}C`,
			backward: (D = 1) => `\x1B[${D}D`,
			nextLine: (D = 1) => '\x1B[E'.repeat(D),
			prevLine: (D = 1) => '\x1B[F'.repeat(D),
			left: '\x1B[G',
			hide: '\x1B[?25l',
			show: '\x1B[?25h',
			save: '\x1B7',
			restore: '\x1B8'
		},
		l7 = { up: (D = 1) => '\x1B[S'.repeat(D), down: (D = 1) => '\x1B[T'.repeat(D) },
		p7 = {
			screen: '\x1B[2J',
			up: (D = 1) => '\x1B[1J'.repeat(D),
			down: (D = 1) => '\x1B[J'.repeat(D),
			line: '\x1B[2K',
			lineEnd: '\x1B[K',
			lineStart: '\x1B[1K',
			lines(D) {
				let u = '';
				for (let F = 0; F < D; F++) u += this.line + (F < D - 1 ? au.up() : '');
				if (D) u += au.left;
				return u;
			}
		};
	B3.exports = { cursor: au, scroll: l7, erase: p7, beep: '\x07' };
});
var Z3 = G((S$, $3) => {
	function a7(D, u) {
		var F = (typeof Symbol < 'u' && D[Symbol.iterator]) || D['@@iterator'];
		if (!F) {
			if (Array.isArray(D) || (F = i7(D)) || (u && D && typeof D.length === 'number')) {
				if (F) D = F;
				var E = 0,
					B = function () {};
				return {
					s: B,
					n: function () {
						if (E >= D.length) return { done: !0 };
						return { done: !1, value: D[E++] };
					},
					e: function (Z) {
						throw Z;
					},
					f: B
				};
			}
			throw TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
		}
		var C = !0,
			A = !1,
			_;
		return {
			s: function () {
				F = F.call(D);
			},
			n: function () {
				var Z = F.next();
				return ((C = Z.done), Z);
			},
			e: function (Z) {
				((A = !0), (_ = Z));
			},
			f: function () {
				try {
					if (!C && F.return != null) F.return();
				} finally {
					if (A) throw _;
				}
			}
		};
	}
	function i7(D, u) {
		if (!D) return;
		if (typeof D === 'string') return C3(D, u);
		var F = Object.prototype.toString.call(D).slice(8, -1);
		if (F === 'Object' && D.constructor) F = D.constructor.name;
		if (F === 'Map' || F === 'Set') return Array.from(D);
		if (F === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(F)) return C3(D, u);
	}
	function C3(D, u) {
		if (u == null || u > D.length) u = D.length;
		for (var F = 0, E = Array(u); F < u; F++) E[F] = D[F];
		return E;
	}
	var n7 = b0(),
		_3 = w(),
		A3 = _3.erase,
		s7 = _3.cursor,
		r7 = (D) => [...n7(D)].length;
	$3.exports = function (D, u) {
		if (!u) return A3.line + s7.to(0);
		let F = 0,
			E = D.split(/\r?\n/);
		var B = a7(E),
			C;
		try {
			for (B.s(); !(C = B.n()).done; ) {
				let A = C.value;
				F += 1 + Math.floor(Math.max(r7(A) - 1, 0) / u);
			}
		} catch (A) {
			B.e(A);
		} finally {
			B.f();
		}
		return A3.lines(F);
	};
});
var iu = G((w$, X3) => {
	var B0 = {
			arrowUp: '\u2191',
			arrowDown: '\u2193',
			arrowLeft: '\u2190',
			arrowRight: '\u2192',
			radioOn: '\u25C9',
			radioOff: '\u25EF',
			tick: '\u2714',
			cross: '\u2716',
			ellipsis: '\u2026',
			pointerSmall: '\u203A',
			line: '\u2500',
			pointer: '\u276F'
		},
		t7 = {
			arrowUp: B0.arrowUp,
			arrowDown: B0.arrowDown,
			arrowLeft: B0.arrowLeft,
			arrowRight: B0.arrowRight,
			radioOn: '(*)',
			radioOff: '( )',
			tick: '\u221A',
			cross: '\xD7',
			ellipsis: '...',
			pointerSmall: '\xBB',
			line: '\u2500',
			pointer: '>'
		},
		o7 = process.platform === 'win32' ? t7 : B0;
	X3.exports = o7;
});
var z3 = G((b$, Y3) => {
	var mD = S(),
		wD = iu(),
		nu = Object.freeze({
			password: { scale: 1, render: (D) => '*'.repeat(D.length) },
			emoji: { scale: 2, render: (D) => '\uD83D\uDE03'.repeat(D.length) },
			invisible: { scale: 0, render: (D) => '' },
			default: { scale: 1, render: (D) => `${D}` }
		}),
		e7 = (D) => nu[D] || nu.default,
		C0 = Object.freeze({
			aborted: mD.red(wD.cross),
			done: mD.green(wD.tick),
			exited: mD.yellow(wD.cross),
			default: mD.cyan('?')
		}),
		DC = (D, u, F) => (u ? C0.aborted : F ? C0.exited : D ? C0.done : C0.default),
		uC = (D) => mD.gray(D ? wD.ellipsis : wD.pointerSmall),
		FC = (D, u) => mD.gray(D ? (u ? wD.pointerSmall : '+') : wD.line);
	Y3.exports = { styles: nu, render: e7, symbols: C0, symbol: DC, delimiter: uC, item: FC };
});
var J3 = G((k$, H3) => {
	var EC = b0();
	H3.exports = function (D, u) {
		let F = String(EC(D) || '').split(/\r?\n/);
		if (!u) return F.length;
		return F.map((E) => Math.ceil(E.length / u)).reduce((E, B) => E + B);
	};
});
var G3 = G((x$, Q3) => {
	Q3.exports = (D, u = {}) => {
		let F = Number.isSafeInteger(parseInt(u.margin))
				? Array(parseInt(u.margin)).fill(' ').join('')
				: u.margin || '',
			E = u.width;
		return (D || '').split(/\r?\n/g).map((B) =>
			B.split(/\s+/g).reduce(
				(C, A) => {
					if (A.length + F.length >= E || C[C.length - 1].length + A.length + 1 < E)
						C[C.length - 1] += ` ${A}`;
					else C.push(`${F}${A}`);
					return C;
				},
				[F]
			).join(`
`)
		).join(`
`);
	};
});
var U3 = G((v$, K3) => {
	K3.exports = (D, u, F) => {
		F = F || u;
		let E = Math.min(u - F, D - Math.floor(F / 2));
		if (E < 0) E = 0;
		let B = Math.min(E + F, u);
		return { startIndex: E, endIndex: B };
	};
});
var o = G((y$, M3) => {
	M3.exports = {
		action: F3(),
		clear: Z3(),
		style: z3(),
		strip: b0(),
		figures: iu(),
		lines: J3(),
		wrap: G3(),
		entriesToDisplay: U3()
	};
});
var KD = G((h$, L3) => {
	var W3 = uD('readline'),
		BC = o(),
		CC = BC.action,
		AC = uD('events'),
		R3 = w(),
		_C = R3.beep,
		$C = R3.cursor,
		ZC = S();
	class q3 extends AC {
		constructor(D = {}) {
			super();
			((this.firstRender = !0),
				(this.in = D.stdin || process.stdin),
				(this.out = D.stdout || process.stdout),
				(this.onRender = (
					D.onRender ||
					(() => {
						return;
					})
				).bind(this)));
			let u = W3.createInterface({ input: this.in, escapeCodeTimeout: 50 });
			if ((W3.emitKeypressEvents(this.in, u), this.in.isTTY)) this.in.setRawMode(!0);
			let F = ['SelectPrompt', 'MultiselectPrompt'].indexOf(this.constructor.name) > -1,
				E = (B, C) => {
					let A = CC(C, F);
					if (A === !1) this._ && this._(B, C);
					else if (typeof this[A] === 'function') this[A](C);
					else this.bell();
				};
			((this.close = () => {
				if ((this.out.write($C.show), this.in.removeListener('keypress', E), this.in.isTTY))
					this.in.setRawMode(!1);
				(u.close(),
					this.emit(this.aborted ? 'abort' : this.exited ? 'exit' : 'submit', this.value),
					(this.closed = !0));
			}),
				this.in.on('keypress', E));
		}
		fire() {
			this.emit('state', { value: this.value, aborted: !!this.aborted, exited: !!this.exited });
		}
		bell() {
			this.out.write(_C);
		}
		render() {
			if ((this.onRender(ZC), this.firstRender)) this.firstRender = !1;
		}
	}
	L3.exports = q3;
});
var O3 = G((f$, j3) => {
	function V3(D, u, F, E, B, C, A) {
		try {
			var _ = D[C](A),
				$ = _.value;
		} catch (Z) {
			F(Z);
			return;
		}
		if (_.done) u($);
		else Promise.resolve($).then(E, B);
	}
	function N3(D) {
		return function () {
			var u = this,
				F = arguments;
			return new Promise(function (E, B) {
				var C = D.apply(u, F);
				function A($) {
					V3(C, E, B, A, _, 'next', $);
				}
				function _($) {
					V3(C, E, B, A, _, 'throw', $);
				}
				A(void 0);
			});
		};
	}
	var k0 = S(),
		XC = KD(),
		T3 = w(),
		YC = T3.erase,
		A0 = T3.cursor,
		x0 = o(),
		su = x0.style,
		ru = x0.clear,
		zC = x0.lines,
		HC = x0.figures;
	class I3 extends XC {
		constructor(D = {}) {
			super(D);
			((this.transform = su.render(D.style)),
				(this.scale = this.transform.scale),
				(this.msg = D.message),
				(this.initial = D.initial || ''),
				(this.validator = D.validate || (() => !0)),
				(this.value = ''),
				(this.errorMsg = D.error || 'Please Enter A Valid Value'),
				(this.cursor = Number(!!this.initial)),
				(this.cursorOffset = 0),
				(this.clear = ru('', this.out.columns)),
				this.render());
		}
		set value(D) {
			if (!D && this.initial)
				((this.placeholder = !0), (this.rendered = k0.gray(this.transform.render(this.initial))));
			else ((this.placeholder = !1), (this.rendered = this.transform.render(D)));
			((this._value = D), this.fire());
		}
		get value() {
			return this._value;
		}
		reset() {
			((this.value = ''),
				(this.cursor = Number(!!this.initial)),
				(this.cursorOffset = 0),
				this.fire(),
				this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.value = this.value || this.initial),
				(this.done = this.aborted = !0),
				(this.error = !1),
				(this.red = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		validate() {
			var D = this;
			return N3(function* () {
				let u = yield D.validator(D.value);
				if (typeof u === 'string') ((D.errorMsg = u), (u = !1));
				D.error = !u;
			})();
		}
		submit() {
			var D = this;
			return N3(function* () {
				if (
					((D.value = D.value || D.initial),
					(D.cursorOffset = 0),
					(D.cursor = D.rendered.length),
					yield D.validate(),
					D.error)
				) {
					((D.red = !0), D.fire(), D.render());
					return;
				}
				((D.done = !0),
					(D.aborted = !1),
					D.fire(),
					D.render(),
					D.out.write(`
`),
					D.close());
			})();
		}
		next() {
			if (!this.placeholder) return this.bell();
			((this.value = this.initial),
				(this.cursor = this.rendered.length),
				this.fire(),
				this.render());
		}
		moveCursor(D) {
			if (this.placeholder) return;
			((this.cursor = this.cursor + D), (this.cursorOffset += D));
		}
		_(D, u) {
			let F = this.value.slice(0, this.cursor),
				E = this.value.slice(this.cursor);
			((this.value = `${F}${D}${E}`),
				(this.red = !1),
				(this.cursor = this.placeholder ? 0 : F.length + 1),
				this.render());
		}
		delete() {
			if (this.isCursorAtStart()) return this.bell();
			let D = this.value.slice(0, this.cursor - 1),
				u = this.value.slice(this.cursor);
			if (((this.value = `${D}${u}`), (this.red = !1), this.isCursorAtStart()))
				this.cursorOffset = 0;
			else (this.cursorOffset++, this.moveCursor(-1));
			this.render();
		}
		deleteForward() {
			if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
			let D = this.value.slice(0, this.cursor),
				u = this.value.slice(this.cursor + 1);
			if (((this.value = `${D}${u}`), (this.red = !1), this.isCursorAtEnd())) this.cursorOffset = 0;
			else this.cursorOffset++;
			this.render();
		}
		first() {
			((this.cursor = 0), this.render());
		}
		last() {
			((this.cursor = this.value.length), this.render());
		}
		left() {
			if (this.cursor <= 0 || this.placeholder) return this.bell();
			(this.moveCursor(-1), this.render());
		}
		right() {
			if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
			(this.moveCursor(1), this.render());
		}
		isCursorAtStart() {
			return this.cursor === 0 || (this.placeholder && this.cursor === 1);
		}
		isCursorAtEnd() {
			return (
				this.cursor === this.rendered.length ||
				(this.placeholder && this.cursor === this.rendered.length + 1)
			);
		}
		render() {
			if (this.closed) return;
			if (!this.firstRender) {
				if (this.outputError)
					this.out.write(
						A0.down(zC(this.outputError, this.out.columns) - 1) +
							ru(this.outputError, this.out.columns)
					);
				this.out.write(ru(this.outputText, this.out.columns));
			}
			if (
				(super.render(),
				(this.outputError = ''),
				(this.outputText = [
					su.symbol(this.done, this.aborted),
					k0.bold(this.msg),
					su.delimiter(this.done),
					this.red ? k0.red(this.rendered) : this.rendered
				].join(' ')),
				this.error)
			)
				this.outputError += this.errorMsg
					.split(
						`
`
					)
					.reduce(
						(D, u, F) =>
							D +
							`
${F ? ' ' : HC.pointerSmall} ${k0.red().italic(u)}`,
						''
					);
			this.out.write(
				YC.line +
					A0.to(0) +
					this.outputText +
					A0.save +
					this.outputError +
					A0.restore +
					A0.move(this.cursorOffset, 0)
			);
		}
	}
	j3.exports = I3;
});
var k3 = G((g$, b3) => {
	var UD = S(),
		JC = KD(),
		_0 = o(),
		P3 = _0.style,
		S3 = _0.clear,
		v0 = _0.figures,
		QC = _0.wrap,
		GC = _0.entriesToDisplay,
		KC = w(),
		UC = KC.cursor;
	class w3 extends JC {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.hint = D.hint || '- Use arrow-keys. Return to submit.'),
				(this.warn = D.warn || '- This option is disabled'),
				(this.cursor = D.initial || 0),
				(this.choices = D.choices.map((u, F) => {
					if (typeof u === 'string') u = { title: u, value: F };
					return {
						title: u && (u.title || u.value || u),
						value: u && (u.value === void 0 ? F : u.value),
						description: u && u.description,
						selected: u && u.selected,
						disabled: u && u.disabled
					};
				})),
				(this.optionsPerPage = D.optionsPerPage || 10),
				(this.value = (this.choices[this.cursor] || {}).value),
				(this.clear = S3('', this.out.columns)),
				this.render());
		}
		moveCursor(D) {
			((this.cursor = D), (this.value = this.choices[D].value), this.fire());
		}
		reset() {
			(this.moveCursor(0), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			if (!this.selection.disabled)
				((this.done = !0),
					(this.aborted = !1),
					this.fire(),
					this.render(),
					this.out.write(`
`),
					this.close());
			else this.bell();
		}
		first() {
			(this.moveCursor(0), this.render());
		}
		last() {
			(this.moveCursor(this.choices.length - 1), this.render());
		}
		up() {
			if (this.cursor === 0) this.moveCursor(this.choices.length - 1);
			else this.moveCursor(this.cursor - 1);
			this.render();
		}
		down() {
			if (this.cursor === this.choices.length - 1) this.moveCursor(0);
			else this.moveCursor(this.cursor + 1);
			this.render();
		}
		next() {
			(this.moveCursor((this.cursor + 1) % this.choices.length), this.render());
		}
		_(D, u) {
			if (D === ' ') return this.submit();
		}
		get selection() {
			return this.choices[this.cursor];
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(UC.hide);
			else this.out.write(S3(this.outputText, this.out.columns));
			super.render();
			let D = GC(this.cursor, this.choices.length, this.optionsPerPage),
				u = D.startIndex,
				F = D.endIndex;
			if (
				((this.outputText = [
					P3.symbol(this.done, this.aborted),
					UD.bold(this.msg),
					P3.delimiter(!1),
					this.done
						? this.selection.title
						: this.selection.disabled
							? UD.yellow(this.warn)
							: UD.gray(this.hint)
				].join(' ')),
				!this.done)
			) {
				this.outputText += `
`;
				for (let E = u; E < F; E++) {
					let B,
						C,
						A = '',
						_ = this.choices[E];
					if (E === u && u > 0) C = v0.arrowUp;
					else if (E === F - 1 && F < this.choices.length) C = v0.arrowDown;
					else C = ' ';
					if (_.disabled)
						((B =
							this.cursor === E ? UD.gray().underline(_.title) : UD.strikethrough().gray(_.title)),
							(C = (this.cursor === E ? UD.bold().gray(v0.pointer) + ' ' : '  ') + C));
					else if (
						((B = this.cursor === E ? UD.cyan().underline(_.title) : _.title),
						(C = (this.cursor === E ? UD.cyan(v0.pointer) + ' ' : '  ') + C),
						_.description && this.cursor === E)
					) {
						if (
							((A = ` - ${_.description}`),
							C.length + B.length + A.length >= this.out.columns ||
								_.description.split(/\r?\n/).length > 1)
						)
							A =
								`
` + QC(_.description, { margin: 3, width: this.out.columns });
					}
					this.outputText += `${C} ${B}${UD.gray(A)}
`;
				}
			}
			this.out.write(this.outputText);
		}
	}
	b3.exports = w3;
});
var m3 = G((m$, g3) => {
	var y0 = S(),
		MC = KD(),
		y3 = o(),
		x3 = y3.style,
		WC = y3.clear,
		h3 = w(),
		v3 = h3.cursor,
		RC = h3.erase;
	class f3 extends MC {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.value = !!D.initial),
				(this.active = D.active || 'on'),
				(this.inactive = D.inactive || 'off'),
				(this.initialValue = this.value),
				this.render());
		}
		reset() {
			((this.value = this.initialValue), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			((this.done = !0),
				(this.aborted = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		deactivate() {
			if (this.value === !1) return this.bell();
			((this.value = !1), this.render());
		}
		activate() {
			if (this.value === !0) return this.bell();
			((this.value = !0), this.render());
		}
		delete() {
			this.deactivate();
		}
		left() {
			this.deactivate();
		}
		right() {
			this.activate();
		}
		down() {
			this.deactivate();
		}
		up() {
			this.activate();
		}
		next() {
			((this.value = !this.value), this.fire(), this.render());
		}
		_(D, u) {
			if (D === ' ') this.value = !this.value;
			else if (D === '1') this.value = !0;
			else if (D === '0') this.value = !1;
			else return this.bell();
			this.render();
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(v3.hide);
			else this.out.write(WC(this.outputText, this.out.columns));
			(super.render(),
				(this.outputText = [
					x3.symbol(this.done, this.aborted),
					y0.bold(this.msg),
					x3.delimiter(this.done),
					this.value ? this.inactive : y0.cyan().underline(this.inactive),
					y0.gray('/'),
					this.value ? y0.cyan().underline(this.active) : this.active
				].join(' ')),
				this.out.write(RC.line + v3.to(0) + this.outputText));
		}
	}
	g3.exports = f3;
});
var $D = G((d$, d3) => {
	class h0 {
		constructor({ token: D, date: u, parts: F, locales: E }) {
			((this.token = D),
				(this.date = u || new Date()),
				(this.parts = F || [this]),
				(this.locales = E || {}));
		}
		up() {}
		down() {}
		next() {
			let D = this.parts.indexOf(this);
			return this.parts.find((u, F) => F > D && u instanceof h0);
		}
		setTo(D) {}
		prev() {
			let D = [].concat(this.parts).reverse(),
				u = D.indexOf(this);
			return D.find((F, E) => E > u && F instanceof h0);
		}
		toString() {
			return String(this.date);
		}
	}
	d3.exports = h0;
});
var p3 = G((c$, l3) => {
	var qC = $D();
	class c3 extends qC {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setHours((this.date.getHours() + 12) % 24);
		}
		down() {
			this.up();
		}
		toString() {
			let D = this.date.getHours() > 12 ? 'pm' : 'am';
			return /\A/.test(this.token) ? D.toUpperCase() : D;
		}
	}
	l3.exports = c3;
});
var n3 = G((l$, i3) => {
	var LC = $D(),
		VC = (D) => {
			return ((D = D % 10), D === 1 ? 'st' : D === 2 ? 'nd' : D === 3 ? 'rd' : 'th');
		};
	class a3 extends LC {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setDate(this.date.getDate() + 1);
		}
		down() {
			this.date.setDate(this.date.getDate() - 1);
		}
		setTo(D) {
			this.date.setDate(parseInt(D.substr(-2)));
		}
		toString() {
			let D = this.date.getDate(),
				u = this.date.getDay();
			return this.token === 'DD'
				? String(D).padStart(2, '0')
				: this.token === 'Do'
					? D + VC(D)
					: this.token === 'd'
						? u + 1
						: this.token === 'ddd'
							? this.locales.weekdaysShort[u]
							: this.token === 'dddd'
								? this.locales.weekdays[u]
								: D;
		}
	}
	i3.exports = a3;
});
var t3 = G((p$, r3) => {
	var NC = $D();
	class s3 extends NC {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setHours(this.date.getHours() + 1);
		}
		down() {
			this.date.setHours(this.date.getHours() - 1);
		}
		setTo(D) {
			this.date.setHours(parseInt(D.substr(-2)));
		}
		toString() {
			let D = this.date.getHours();
			if (/h/.test(this.token)) D = D % 12 || 12;
			return this.token.length > 1 ? String(D).padStart(2, '0') : D;
		}
	}
	r3.exports = s3;
});
var D8 = G((a$, e3) => {
	var TC = $D();
	class o3 extends TC {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setMilliseconds(this.date.getMilliseconds() + 1);
		}
		down() {
			this.date.setMilliseconds(this.date.getMilliseconds() - 1);
		}
		setTo(D) {
			this.date.setMilliseconds(parseInt(D.substr(-this.token.length)));
		}
		toString() {
			return String(this.date.getMilliseconds()).padStart(4, '0').substr(0, this.token.length);
		}
	}
	e3.exports = o3;
});
var E8 = G((i$, F8) => {
	var IC = $D();
	class u8 extends IC {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setMinutes(this.date.getMinutes() + 1);
		}
		down() {
			this.date.setMinutes(this.date.getMinutes() - 1);
		}
		setTo(D) {
			this.date.setMinutes(parseInt(D.substr(-2)));
		}
		toString() {
			let D = this.date.getMinutes();
			return this.token.length > 1 ? String(D).padStart(2, '0') : D;
		}
	}
	F8.exports = u8;
});
var A8 = G((n$, C8) => {
	var jC = $D();
	class B8 extends jC {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setMonth(this.date.getMonth() + 1);
		}
		down() {
			this.date.setMonth(this.date.getMonth() - 1);
		}
		setTo(D) {
			((D = parseInt(D.substr(-2)) - 1), this.date.setMonth(D < 0 ? 0 : D));
		}
		toString() {
			let D = this.date.getMonth(),
				u = this.token.length;
			return u === 2
				? String(D + 1).padStart(2, '0')
				: u === 3
					? this.locales.monthsShort[D]
					: u === 4
						? this.locales.months[D]
						: String(D + 1);
		}
	}
	C8.exports = B8;
});
var Z8 = G((s$, $8) => {
	var OC = $D();
	class _8 extends OC {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setSeconds(this.date.getSeconds() + 1);
		}
		down() {
			this.date.setSeconds(this.date.getSeconds() - 1);
		}
		setTo(D) {
			this.date.setSeconds(parseInt(D.substr(-2)));
		}
		toString() {
			let D = this.date.getSeconds();
			return this.token.length > 1 ? String(D).padStart(2, '0') : D;
		}
	}
	$8.exports = _8;
});
var z8 = G((r$, Y8) => {
	var PC = $D();
	class X8 extends PC {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setFullYear(this.date.getFullYear() + 1);
		}
		down() {
			this.date.setFullYear(this.date.getFullYear() - 1);
		}
		setTo(D) {
			this.date.setFullYear(D.substr(-4));
		}
		toString() {
			let D = String(this.date.getFullYear()).padStart(4, '0');
			return this.token.length === 2 ? D.substr(-2) : D;
		}
	}
	Y8.exports = X8;
});
var J8 = G((t$, H8) => {
	H8.exports = {
		DatePart: $D(),
		Meridiem: p3(),
		Day: n3(),
		Hours: t3(),
		Milliseconds: D8(),
		Minutes: E8(),
		Month: A8(),
		Seconds: Z8(),
		Year: z8()
	};
});
var N8 = G((o$, V8) => {
	function Q8(D, u, F, E, B, C, A) {
		try {
			var _ = D[C](A),
				$ = _.value;
		} catch (Z) {
			F(Z);
			return;
		}
		if (_.done) u($);
		else Promise.resolve($).then(E, B);
	}
	function G8(D) {
		return function () {
			var u = this,
				F = arguments;
			return new Promise(function (E, B) {
				var C = D.apply(u, F);
				function A($) {
					Q8(C, E, B, A, _, 'next', $);
				}
				function _($) {
					Q8(C, E, B, A, _, 'throw', $);
				}
				A(void 0);
			});
		};
	}
	var tu = S(),
		SC = KD(),
		ou = o(),
		K8 = ou.style,
		U8 = ou.clear,
		wC = ou.figures,
		q8 = w(),
		bC = q8.erase,
		M8 = q8.cursor,
		MD = J8(),
		W8 = MD.DatePart,
		kC = MD.Meridiem,
		xC = MD.Day,
		vC = MD.Hours,
		yC = MD.Milliseconds,
		hC = MD.Minutes,
		fC = MD.Month,
		gC = MD.Seconds,
		mC = MD.Year,
		dC =
			/\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g,
		R8 = {
			1: ({ token: D }) => D.replace(/\\(.)/g, '$1'),
			2: (D) => new xC(D),
			3: (D) => new fC(D),
			4: (D) => new mC(D),
			5: (D) => new kC(D),
			6: (D) => new vC(D),
			7: (D) => new hC(D),
			8: (D) => new gC(D),
			9: (D) => new yC(D)
		},
		cC = {
			months:
				'January,February,March,April,May,June,July,August,September,October,November,December'.split(
					','
				),
			monthsShort: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(','),
			weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(','),
			weekdaysShort: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',')
		};
	class L8 extends SC {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.cursor = 0),
				(this.typed = ''),
				(this.locales = Object.assign(cC, D.locales)),
				(this._date = D.initial || new Date()),
				(this.errorMsg = D.error || 'Please Enter A Valid Value'),
				(this.validator = D.validate || (() => !0)),
				(this.mask = D.mask || 'YYYY-MM-DD HH:mm:ss'),
				(this.clear = U8('', this.out.columns)),
				this.render());
		}
		get value() {
			return this.date;
		}
		get date() {
			return this._date;
		}
		set date(D) {
			if (D) this._date.setTime(D.getTime());
		}
		set mask(D) {
			let u;
			this.parts = [];
			while ((u = dC.exec(D))) {
				let E = u.shift(),
					B = u.findIndex((C) => C != null);
				this.parts.push(
					B in R8
						? R8[B]({ token: u[B] || E, date: this.date, parts: this.parts, locales: this.locales })
						: u[B] || E
				);
			}
			let F = this.parts.reduce((E, B) => {
				if (typeof B === 'string' && typeof E[E.length - 1] === 'string') E[E.length - 1] += B;
				else E.push(B);
				return E;
			}, []);
			(this.parts.splice(0), this.parts.push(...F), this.reset());
		}
		moveCursor(D) {
			((this.typed = ''), (this.cursor = D), this.fire());
		}
		reset() {
			(this.moveCursor(this.parts.findIndex((D) => D instanceof W8)), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				(this.error = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		validate() {
			var D = this;
			return G8(function* () {
				let u = yield D.validator(D.value);
				if (typeof u === 'string') ((D.errorMsg = u), (u = !1));
				D.error = !u;
			})();
		}
		submit() {
			var D = this;
			return G8(function* () {
				if ((yield D.validate(), D.error)) {
					((D.color = 'red'), D.fire(), D.render());
					return;
				}
				((D.done = !0),
					(D.aborted = !1),
					D.fire(),
					D.render(),
					D.out.write(`
`),
					D.close());
			})();
		}
		up() {
			((this.typed = ''), this.parts[this.cursor].up(), this.render());
		}
		down() {
			((this.typed = ''), this.parts[this.cursor].down(), this.render());
		}
		left() {
			let D = this.parts[this.cursor].prev();
			if (D == null) return this.bell();
			(this.moveCursor(this.parts.indexOf(D)), this.render());
		}
		right() {
			let D = this.parts[this.cursor].next();
			if (D == null) return this.bell();
			(this.moveCursor(this.parts.indexOf(D)), this.render());
		}
		next() {
			let D = this.parts[this.cursor].next();
			(this.moveCursor(D ? this.parts.indexOf(D) : this.parts.findIndex((u) => u instanceof W8)),
				this.render());
		}
		_(D) {
			if (/\d/.test(D))
				((this.typed += D), this.parts[this.cursor].setTo(this.typed), this.render());
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(M8.hide);
			else this.out.write(U8(this.outputText, this.out.columns));
			if (
				(super.render(),
				(this.outputText = [
					K8.symbol(this.done, this.aborted),
					tu.bold(this.msg),
					K8.delimiter(!1),
					this.parts
						.reduce(
							(D, u, F) =>
								D.concat(F === this.cursor && !this.done ? tu.cyan().underline(u.toString()) : u),
							[]
						)
						.join('')
				].join(' ')),
				this.error)
			)
				this.outputText += this.errorMsg
					.split(
						`
`
					)
					.reduce(
						(D, u, F) =>
							D +
							`
${F ? ' ' : wC.pointerSmall} ${tu.red().italic(u)}`,
						''
					);
			this.out.write(bC.line + M8.to(0) + this.outputText);
		}
	}
	V8.exports = L8;
});
var b8 = G((e$, w8) => {
	function T8(D, u, F, E, B, C, A) {
		try {
			var _ = D[C](A),
				$ = _.value;
		} catch (Z) {
			F(Z);
			return;
		}
		if (_.done) u($);
		else Promise.resolve($).then(E, B);
	}
	function I8(D) {
		return function () {
			var u = this,
				F = arguments;
			return new Promise(function (E, B) {
				var C = D.apply(u, F);
				function A($) {
					T8(C, E, B, A, _, 'next', $);
				}
				function _($) {
					T8(C, E, B, A, _, 'throw', $);
				}
				A(void 0);
			});
		};
	}
	var f0 = S(),
		lC = KD(),
		P8 = w(),
		g0 = P8.cursor,
		pC = P8.erase,
		m0 = o(),
		eu = m0.style,
		aC = m0.figures,
		j8 = m0.clear,
		iC = m0.lines,
		nC = /[0-9]/,
		DF = (D) => D !== void 0,
		O8 = (D, u) => {
			let F = Math.pow(10, u);
			return Math.round(D * F) / F;
		};
	class S8 extends lC {
		constructor(D = {}) {
			super(D);
			((this.transform = eu.render(D.style)),
				(this.msg = D.message),
				(this.initial = DF(D.initial) ? D.initial : ''),
				(this.float = !!D.float),
				(this.round = D.round || 2),
				(this.inc = D.increment || 1),
				(this.min = DF(D.min) ? D.min : -1 / 0),
				(this.max = DF(D.max) ? D.max : 1 / 0),
				(this.errorMsg = D.error || 'Please Enter A Valid Value'),
				(this.validator = D.validate || (() => !0)),
				(this.color = 'cyan'),
				(this.value = ''),
				(this.typed = ''),
				(this.lastHit = 0),
				this.render());
		}
		set value(D) {
			if (!D && D !== 0)
				((this.placeholder = !0),
					(this.rendered = f0.gray(this.transform.render(`${this.initial}`))),
					(this._value = ''));
			else
				((this.placeholder = !1),
					(this.rendered = this.transform.render(`${O8(D, this.round)}`)),
					(this._value = O8(D, this.round)));
			this.fire();
		}
		get value() {
			return this._value;
		}
		parse(D) {
			return this.float ? parseFloat(D) : parseInt(D);
		}
		valid(D) {
			return D === '-' || (D === '.' && this.float) || nC.test(D);
		}
		reset() {
			((this.typed = ''), (this.value = ''), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			let D = this.value;
			((this.value = D !== '' ? D : this.initial),
				(this.done = this.aborted = !0),
				(this.error = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		validate() {
			var D = this;
			return I8(function* () {
				let u = yield D.validator(D.value);
				if (typeof u === 'string') ((D.errorMsg = u), (u = !1));
				D.error = !u;
			})();
		}
		submit() {
			var D = this;
			return I8(function* () {
				if ((yield D.validate(), D.error)) {
					((D.color = 'red'), D.fire(), D.render());
					return;
				}
				let u = D.value;
				((D.value = u !== '' ? u : D.initial),
					(D.done = !0),
					(D.aborted = !1),
					(D.error = !1),
					D.fire(),
					D.render(),
					D.out.write(`
`),
					D.close());
			})();
		}
		up() {
			if (((this.typed = ''), this.value === '')) this.value = this.min - this.inc;
			if (this.value >= this.max) return this.bell();
			((this.value += this.inc), (this.color = 'cyan'), this.fire(), this.render());
		}
		down() {
			if (((this.typed = ''), this.value === '')) this.value = this.min + this.inc;
			if (this.value <= this.min) return this.bell();
			((this.value -= this.inc), (this.color = 'cyan'), this.fire(), this.render());
		}
		delete() {
			let D = this.value.toString();
			if (D.length === 0) return this.bell();
			if (
				((this.value = this.parse((D = D.slice(0, -1))) || ''),
				this.value !== '' && this.value < this.min)
			)
				this.value = this.min;
			((this.color = 'cyan'), this.fire(), this.render());
		}
		next() {
			((this.value = this.initial), this.fire(), this.render());
		}
		_(D, u) {
			if (!this.valid(D)) return this.bell();
			let F = Date.now();
			if (F - this.lastHit > 1000) this.typed = '';
			if (((this.typed += D), (this.lastHit = F), (this.color = 'cyan'), D === '.'))
				return this.fire();
			if (((this.value = Math.min(this.parse(this.typed), this.max)), this.value > this.max))
				this.value = this.max;
			if (this.value < this.min) this.value = this.min;
			(this.fire(), this.render());
		}
		render() {
			if (this.closed) return;
			if (!this.firstRender) {
				if (this.outputError)
					this.out.write(
						g0.down(iC(this.outputError, this.out.columns) - 1) +
							j8(this.outputError, this.out.columns)
					);
				this.out.write(j8(this.outputText, this.out.columns));
			}
			if (
				(super.render(),
				(this.outputError = ''),
				(this.outputText = [
					eu.symbol(this.done, this.aborted),
					f0.bold(this.msg),
					eu.delimiter(this.done),
					!this.done || (!this.done && !this.placeholder)
						? f0[this.color]().underline(this.rendered)
						: this.rendered
				].join(' ')),
				this.error)
			)
				this.outputError += this.errorMsg
					.split(
						`
`
					)
					.reduce(
						(D, u, F) =>
							D +
							`
${F ? ' ' : aC.pointerSmall} ${f0.red().italic(u)}`,
						''
					);
			this.out.write(
				pC.line + g0.to(0) + this.outputText + g0.save + this.outputError + g0.restore
			);
		}
	}
	w8.exports = S8;
});
var uF = G((DZ, y8) => {
	var ZD = S(),
		sC = w(),
		rC = sC.cursor,
		tC = KD(),
		$0 = o(),
		k8 = $0.clear,
		TD = $0.figures,
		x8 = $0.style,
		oC = $0.wrap,
		eC = $0.entriesToDisplay;
	class v8 extends tC {
		constructor(D = {}) {
			super(D);
			if (
				((this.msg = D.message),
				(this.cursor = D.cursor || 0),
				(this.scrollIndex = D.cursor || 0),
				(this.hint = D.hint || ''),
				(this.warn = D.warn || '- This option is disabled -'),
				(this.minSelected = D.min),
				(this.showMinError = !1),
				(this.maxChoices = D.max),
				(this.instructions = D.instructions),
				(this.optionsPerPage = D.optionsPerPage || 10),
				(this.value = D.choices.map((u, F) => {
					if (typeof u === 'string') u = { title: u, value: F };
					return {
						title: u && (u.title || u.value || u),
						description: u && u.description,
						value: u && (u.value === void 0 ? F : u.value),
						selected: u && u.selected,
						disabled: u && u.disabled
					};
				})),
				(this.clear = k8('', this.out.columns)),
				!D.overrideRender)
			)
				this.render();
		}
		reset() {
			(this.value.map((D) => !D.selected), (this.cursor = 0), this.fire(), this.render());
		}
		selected() {
			return this.value.filter((D) => D.selected);
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			let D = this.value.filter((u) => u.selected);
			if (this.minSelected && D.length < this.minSelected)
				((this.showMinError = !0), this.render());
			else
				((this.done = !0),
					(this.aborted = !1),
					this.fire(),
					this.render(),
					this.out.write(`
`),
					this.close());
		}
		first() {
			((this.cursor = 0), this.render());
		}
		last() {
			((this.cursor = this.value.length - 1), this.render());
		}
		next() {
			((this.cursor = (this.cursor + 1) % this.value.length), this.render());
		}
		up() {
			if (this.cursor === 0) this.cursor = this.value.length - 1;
			else this.cursor--;
			this.render();
		}
		down() {
			if (this.cursor === this.value.length - 1) this.cursor = 0;
			else this.cursor++;
			this.render();
		}
		left() {
			((this.value[this.cursor].selected = !1), this.render());
		}
		right() {
			if (this.value.filter((D) => D.selected).length >= this.maxChoices) return this.bell();
			((this.value[this.cursor].selected = !0), this.render());
		}
		handleSpaceToggle() {
			let D = this.value[this.cursor];
			if (D.selected) ((D.selected = !1), this.render());
			else if (D.disabled || this.value.filter((u) => u.selected).length >= this.maxChoices)
				return this.bell();
			else ((D.selected = !0), this.render());
		}
		toggleAll() {
			if (this.maxChoices !== void 0 || this.value[this.cursor].disabled) return this.bell();
			let D = !this.value[this.cursor].selected;
			(this.value.filter((u) => !u.disabled).forEach((u) => (u.selected = D)), this.render());
		}
		_(D, u) {
			if (D === ' ') this.handleSpaceToggle();
			else if (D === 'a') this.toggleAll();
			else return this.bell();
		}
		renderInstructions() {
			if (this.instructions === void 0 || this.instructions) {
				if (typeof this.instructions === 'string') return this.instructions;
				return (
					`
Instructions:
    ${TD.arrowUp}/${TD.arrowDown}: Highlight option
    ${TD.arrowLeft}/${TD.arrowRight}/[space]: Toggle selection
` +
					(this.maxChoices === void 0
						? `    a: Toggle all
`
						: '') +
					'    enter/return: Complete answer'
				);
			}
			return '';
		}
		renderOption(D, u, F, E) {
			let B = (u.selected ? ZD.green(TD.radioOn) : TD.radioOff) + ' ' + E + ' ',
				C,
				A;
			if (u.disabled) C = D === F ? ZD.gray().underline(u.title) : ZD.strikethrough().gray(u.title);
			else if (((C = D === F ? ZD.cyan().underline(u.title) : u.title), D === F && u.description)) {
				if (
					((A = ` - ${u.description}`),
					B.length + C.length + A.length >= this.out.columns ||
						u.description.split(/\r?\n/).length > 1)
				)
					A =
						`
` + oC(u.description, { margin: B.length, width: this.out.columns });
			}
			return B + C + ZD.gray(A || '');
		}
		paginateOptions(D) {
			if (D.length === 0) return ZD.red('No matches for this query.');
			let u = eC(this.cursor, D.length, this.optionsPerPage),
				F = u.startIndex,
				E = u.endIndex,
				B,
				C = [];
			for (let A = F; A < E; A++) {
				if (A === F && F > 0) B = TD.arrowUp;
				else if (A === E - 1 && E < D.length) B = TD.arrowDown;
				else B = ' ';
				C.push(this.renderOption(this.cursor, D[A], A, B));
			}
			return (
				`
` +
				C.join(`
`)
			);
		}
		renderOptions(D) {
			if (!this.done) return this.paginateOptions(D);
			return '';
		}
		renderDoneOrInstructions() {
			if (this.done)
				return this.value
					.filter((u) => u.selected)
					.map((u) => u.title)
					.join(', ');
			let D = [ZD.gray(this.hint), this.renderInstructions()];
			if (this.value[this.cursor].disabled) D.push(ZD.yellow(this.warn));
			return D.join(' ');
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(rC.hide);
			super.render();
			let D = [
				x8.symbol(this.done, this.aborted),
				ZD.bold(this.msg),
				x8.delimiter(!1),
				this.renderDoneOrInstructions()
			].join(' ');
			if (this.showMinError)
				((D += ZD.red(`You must select a minimum of ${this.minSelected} choices.`)),
					(this.showMinError = !1));
			((D += this.renderOptions(this.value)),
				this.out.write(this.clear + D),
				(this.clear = k8(D, this.out.columns)));
		}
	}
	y8.exports = v8;
});
var p8 = G((uZ, l8) => {
	function h8(D, u, F, E, B, C, A) {
		try {
			var _ = D[C](A),
				$ = _.value;
		} catch (Z) {
			F(Z);
			return;
		}
		if (_.done) u($);
		else Promise.resolve($).then(E, B);
	}
	function D9(D) {
		return function () {
			var u = this,
				F = arguments;
			return new Promise(function (E, B) {
				var C = D.apply(u, F);
				function A($) {
					h8(C, E, B, A, _, 'next', $);
				}
				function _($) {
					h8(C, E, B, A, _, 'throw', $);
				}
				A(void 0);
			});
		};
	}
	var Z0 = S(),
		u9 = KD(),
		d8 = w(),
		F9 = d8.erase,
		f8 = d8.cursor,
		X0 = o(),
		FF = X0.style,
		g8 = X0.clear,
		EF = X0.figures,
		E9 = X0.wrap,
		B9 = X0.entriesToDisplay,
		m8 = (D, u) => D[u] && (D[u].value || D[u].title || D[u]),
		C9 = (D, u) => D[u] && (D[u].title || D[u].value || D[u]),
		A9 = (D, u) => {
			let F = D.findIndex((E) => E.value === u || E.title === u);
			return F > -1 ? F : void 0;
		};
	class c8 extends u9 {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.suggest = D.suggest),
				(this.choices = D.choices),
				(this.initial = typeof D.initial === 'number' ? D.initial : A9(D.choices, D.initial)),
				(this.select = this.initial || D.cursor || 0),
				(this.i18n = { noMatches: D.noMatches || 'no matches found' }),
				(this.fallback = D.fallback || this.initial),
				(this.clearFirst = D.clearFirst || !1),
				(this.suggestions = []),
				(this.input = ''),
				(this.limit = D.limit || 10),
				(this.cursor = 0),
				(this.transform = FF.render(D.style)),
				(this.scale = this.transform.scale),
				(this.render = this.render.bind(this)),
				(this.complete = this.complete.bind(this)),
				(this.clear = g8('', this.out.columns)),
				this.complete(this.render),
				this.render());
		}
		set fallback(D) {
			this._fb = Number.isSafeInteger(parseInt(D)) ? parseInt(D) : D;
		}
		get fallback() {
			let D;
			if (typeof this._fb === 'number') D = this.choices[this._fb];
			else if (typeof this._fb === 'string') D = { title: this._fb };
			return D || this._fb || { title: this.i18n.noMatches };
		}
		moveSelect(D) {
			if (((this.select = D), this.suggestions.length > 0)) this.value = m8(this.suggestions, D);
			else this.value = this.fallback.value;
			this.fire();
		}
		complete(D) {
			var u = this;
			return D9(function* () {
				let F = (u.completing = u.suggest(u.input, u.choices)),
					E = yield F;
				if (u.completing !== F) return;
				((u.suggestions = E.map((C, A, _) => ({
					title: C9(_, A),
					value: m8(_, A),
					description: C.description
				}))),
					(u.completing = !1));
				let B = Math.max(E.length - 1, 0);
				(u.moveSelect(Math.min(B, u.select)), D && D());
			})();
		}
		reset() {
			((this.input = ''),
				this.complete(() => {
					(this.moveSelect(this.initial !== void 0 ? this.initial : 0), this.render());
				}),
				this.render());
		}
		exit() {
			if (this.clearFirst && this.input.length > 0) this.reset();
			else
				((this.done = this.exited = !0),
					(this.aborted = !1),
					this.fire(),
					this.render(),
					this.out.write(`
`),
					this.close());
		}
		abort() {
			((this.done = this.aborted = !0),
				(this.exited = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			((this.done = !0),
				(this.aborted = this.exited = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		_(D, u) {
			let F = this.input.slice(0, this.cursor),
				E = this.input.slice(this.cursor);
			((this.input = `${F}${D}${E}`),
				(this.cursor = F.length + 1),
				this.complete(this.render),
				this.render());
		}
		delete() {
			if (this.cursor === 0) return this.bell();
			let D = this.input.slice(0, this.cursor - 1),
				u = this.input.slice(this.cursor);
			((this.input = `${D}${u}`),
				this.complete(this.render),
				(this.cursor = this.cursor - 1),
				this.render());
		}
		deleteForward() {
			if (this.cursor * this.scale >= this.rendered.length) return this.bell();
			let D = this.input.slice(0, this.cursor),
				u = this.input.slice(this.cursor + 1);
			((this.input = `${D}${u}`), this.complete(this.render), this.render());
		}
		first() {
			(this.moveSelect(0), this.render());
		}
		last() {
			(this.moveSelect(this.suggestions.length - 1), this.render());
		}
		up() {
			if (this.select === 0) this.moveSelect(this.suggestions.length - 1);
			else this.moveSelect(this.select - 1);
			this.render();
		}
		down() {
			if (this.select === this.suggestions.length - 1) this.moveSelect(0);
			else this.moveSelect(this.select + 1);
			this.render();
		}
		next() {
			if (this.select === this.suggestions.length - 1) this.moveSelect(0);
			else this.moveSelect(this.select + 1);
			this.render();
		}
		nextPage() {
			(this.moveSelect(Math.min(this.select + this.limit, this.suggestions.length - 1)),
				this.render());
		}
		prevPage() {
			(this.moveSelect(Math.max(this.select - this.limit, 0)), this.render());
		}
		left() {
			if (this.cursor <= 0) return this.bell();
			((this.cursor = this.cursor - 1), this.render());
		}
		right() {
			if (this.cursor * this.scale >= this.rendered.length) return this.bell();
			((this.cursor = this.cursor + 1), this.render());
		}
		renderOption(D, u, F, E) {
			let B,
				C = F ? EF.arrowUp : E ? EF.arrowDown : ' ',
				A = u ? Z0.cyan().underline(D.title) : D.title;
			if (((C = (u ? Z0.cyan(EF.pointer) + ' ' : '  ') + C), D.description)) {
				if (
					((B = ` - ${D.description}`),
					C.length + A.length + B.length >= this.out.columns ||
						D.description.split(/\r?\n/).length > 1)
				)
					B =
						`
` + E9(D.description, { margin: 3, width: this.out.columns });
			}
			return C + ' ' + A + Z0.gray(B || '');
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(f8.hide);
			else this.out.write(g8(this.outputText, this.out.columns));
			super.render();
			let D = B9(this.select, this.choices.length, this.limit),
				u = D.startIndex,
				F = D.endIndex;
			if (
				((this.outputText = [
					FF.symbol(this.done, this.aborted, this.exited),
					Z0.bold(this.msg),
					FF.delimiter(this.completing),
					this.done && this.suggestions[this.select]
						? this.suggestions[this.select].title
						: (this.rendered = this.transform.render(this.input))
				].join(' ')),
				!this.done)
			) {
				let E = this.suggestions
					.slice(u, F)
					.map((B, C) =>
						this.renderOption(
							B,
							this.select === C + u,
							C === 0 && u > 0,
							C + u === F - 1 && F < this.choices.length
						)
					).join(`
`);
				this.outputText +=
					`
` + (E || Z0.gray(this.fallback.title));
			}
			this.out.write(F9.line + f8.to(0) + this.outputText);
		}
	}
	l8.exports = c8;
});
var r8 = G((FZ, s8) => {
	var WD = S(),
		_9 = w(),
		$9 = _9.cursor,
		Z9 = uF(),
		BF = o(),
		a8 = BF.clear,
		i8 = BF.style,
		dD = BF.figures;
	class n8 extends Z9 {
		constructor(D = {}) {
			D.overrideRender = !0;
			super(D);
			((this.inputValue = ''),
				(this.clear = a8('', this.out.columns)),
				(this.filteredOptions = this.value),
				this.render());
		}
		last() {
			((this.cursor = this.filteredOptions.length - 1), this.render());
		}
		next() {
			((this.cursor = (this.cursor + 1) % this.filteredOptions.length), this.render());
		}
		up() {
			if (this.cursor === 0) this.cursor = this.filteredOptions.length - 1;
			else this.cursor--;
			this.render();
		}
		down() {
			if (this.cursor === this.filteredOptions.length - 1) this.cursor = 0;
			else this.cursor++;
			this.render();
		}
		left() {
			((this.filteredOptions[this.cursor].selected = !1), this.render());
		}
		right() {
			if (this.value.filter((D) => D.selected).length >= this.maxChoices) return this.bell();
			((this.filteredOptions[this.cursor].selected = !0), this.render());
		}
		delete() {
			if (this.inputValue.length)
				((this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1)),
					this.updateFilteredOptions());
		}
		updateFilteredOptions() {
			let D = this.filteredOptions[this.cursor];
			this.filteredOptions = this.value.filter((F) => {
				if (this.inputValue) {
					if (typeof F.title === 'string') {
						if (F.title.toLowerCase().includes(this.inputValue.toLowerCase())) return !0;
					}
					if (typeof F.value === 'string') {
						if (F.value.toLowerCase().includes(this.inputValue.toLowerCase())) return !0;
					}
					return !1;
				}
				return !0;
			});
			let u = this.filteredOptions.findIndex((F) => F === D);
			((this.cursor = u < 0 ? 0 : u), this.render());
		}
		handleSpaceToggle() {
			let D = this.filteredOptions[this.cursor];
			if (D.selected) ((D.selected = !1), this.render());
			else if (D.disabled || this.value.filter((u) => u.selected).length >= this.maxChoices)
				return this.bell();
			else ((D.selected = !0), this.render());
		}
		handleInputChange(D) {
			((this.inputValue = this.inputValue + D), this.updateFilteredOptions());
		}
		_(D, u) {
			if (D === ' ') this.handleSpaceToggle();
			else this.handleInputChange(D);
		}
		renderInstructions() {
			if (this.instructions === void 0 || this.instructions) {
				if (typeof this.instructions === 'string') return this.instructions;
				return `
Instructions:
    ${dD.arrowUp}/${dD.arrowDown}: Highlight option
    ${dD.arrowLeft}/${dD.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
`;
			}
			return '';
		}
		renderCurrentInput() {
			return `
Filtered results for: ${this.inputValue ? this.inputValue : WD.gray('Enter something to filter')}
`;
		}
		renderOption(D, u, F) {
			let E;
			if (u.disabled) E = D === F ? WD.gray().underline(u.title) : WD.strikethrough().gray(u.title);
			else E = D === F ? WD.cyan().underline(u.title) : u.title;
			return (u.selected ? WD.green(dD.radioOn) : dD.radioOff) + '  ' + E;
		}
		renderDoneOrInstructions() {
			if (this.done)
				return this.value
					.filter((u) => u.selected)
					.map((u) => u.title)
					.join(', ');
			let D = [WD.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];
			if (this.filteredOptions.length && this.filteredOptions[this.cursor].disabled)
				D.push(WD.yellow(this.warn));
			return D.join(' ');
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write($9.hide);
			super.render();
			let D = [
				i8.symbol(this.done, this.aborted),
				WD.bold(this.msg),
				i8.delimiter(!1),
				this.renderDoneOrInstructions()
			].join(' ');
			if (this.showMinError)
				((D += WD.red(`You must select a minimum of ${this.minSelected} choices.`)),
					(this.showMinError = !1));
			((D += this.renderOptions(this.filteredOptions)),
				this.out.write(this.clear + D),
				(this.clear = a8(D, this.out.columns)));
		}
	}
	s8.exports = n8;
});
var B6 = G((EZ, E6) => {
	var t8 = S(),
		X9 = KD(),
		D6 = o(),
		o8 = D6.style,
		Y9 = D6.clear,
		u6 = w(),
		z9 = u6.erase,
		e8 = u6.cursor;
	class F6 extends X9 {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.value = D.initial),
				(this.initialValue = !!D.initial),
				(this.yesMsg = D.yes || 'yes'),
				(this.yesOption = D.yesOption || '(Y/n)'),
				(this.noMsg = D.no || 'no'),
				(this.noOption = D.noOption || '(y/N)'),
				this.render());
		}
		reset() {
			((this.value = this.initialValue), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			((this.value = this.value || !1),
				(this.done = !0),
				(this.aborted = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		_(D, u) {
			if (D.toLowerCase() === 'y') return ((this.value = !0), this.submit());
			if (D.toLowerCase() === 'n') return ((this.value = !1), this.submit());
			return this.bell();
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(e8.hide);
			else this.out.write(Y9(this.outputText, this.out.columns));
			(super.render(),
				(this.outputText = [
					o8.symbol(this.done, this.aborted),
					t8.bold(this.msg),
					o8.delimiter(this.done),
					this.done
						? this.value
							? this.yesMsg
							: this.noMsg
						: t8.gray(this.initialValue ? this.yesOption : this.noOption)
				].join(' ')),
				this.out.write(z9.line + e8.to(0) + this.outputText));
		}
	}
	E6.exports = F6;
});
var A6 = G((BZ, C6) => {
	C6.exports = {
		TextPrompt: O3(),
		SelectPrompt: k3(),
		TogglePrompt: m3(),
		DatePrompt: N8(),
		NumberPrompt: b8(),
		MultiselectPrompt: uF(),
		AutocompletePrompt: p8(),
		AutocompleteMultiselectPrompt: r8(),
		ConfirmPrompt: B6()
	};
});
var $6 = G((_6) => {
	var c = _6,
		H9 = A6(),
		d0 = (D) => D;
	function XD(D, u, F = {}) {
		return new Promise((E, B) => {
			let C = new H9[D](u),
				A = F.onAbort || d0,
				_ = F.onSubmit || d0,
				$ = F.onExit || d0;
			(C.on('state', u.onState || d0),
				C.on('submit', (Z) => E(_(Z))),
				C.on('exit', (Z) => E($(Z))),
				C.on('abort', (Z) => B(A(Z))));
		});
	}
	c.text = (D) => XD('TextPrompt', D);
	c.password = (D) => {
		return ((D.style = 'password'), c.text(D));
	};
	c.invisible = (D) => {
		return ((D.style = 'invisible'), c.text(D));
	};
	c.number = (D) => XD('NumberPrompt', D);
	c.date = (D) => XD('DatePrompt', D);
	c.confirm = (D) => XD('ConfirmPrompt', D);
	c.list = (D) => {
		let u = D.separator || ',';
		return XD('TextPrompt', D, { onSubmit: (F) => F.split(u).map((E) => E.trim()) });
	};
	c.toggle = (D) => XD('TogglePrompt', D);
	c.select = (D) => XD('SelectPrompt', D);
	c.multiselect = (D) => {
		D.choices = [].concat(D.choices || []);
		let u = (F) => F.filter((E) => E.selected).map((E) => E.value);
		return XD('MultiselectPrompt', D, { onAbort: u, onSubmit: u });
	};
	c.autocompleteMultiselect = (D) => {
		D.choices = [].concat(D.choices || []);
		let u = (F) => F.filter((E) => E.selected).map((E) => E.value);
		return XD('AutocompleteMultiselectPrompt', D, { onAbort: u, onSubmit: u });
	};
	var J9 = (D, u) =>
		Promise.resolve(u.filter((F) => F.title.slice(0, D.length).toLowerCase() === D.toLowerCase()));
	c.autocomplete = (D) => {
		return (
			(D.suggest = D.suggest || J9),
			(D.choices = [].concat(D.choices || [])),
			XD('AutocompletePrompt', D)
		);
	};
});
var G6 = G((AZ, Q6) => {
	function Z6(D, u) {
		var F = Object.keys(D);
		if (Object.getOwnPropertySymbols) {
			var E = Object.getOwnPropertySymbols(D);
			if (u)
				E = E.filter(function (B) {
					return Object.getOwnPropertyDescriptor(D, B).enumerable;
				});
			F.push.apply(F, E);
		}
		return F;
	}
	function X6(D) {
		for (var u = 1; u < arguments.length; u++) {
			var F = arguments[u] != null ? arguments[u] : {};
			if (u % 2)
				Z6(Object(F), !0).forEach(function (E) {
					Q9(D, E, F[E]);
				});
			else if (Object.getOwnPropertyDescriptors)
				Object.defineProperties(D, Object.getOwnPropertyDescriptors(F));
			else
				Z6(Object(F)).forEach(function (E) {
					Object.defineProperty(D, E, Object.getOwnPropertyDescriptor(F, E));
				});
		}
		return D;
	}
	function Q9(D, u, F) {
		if (u in D)
			Object.defineProperty(D, u, { value: F, enumerable: !0, configurable: !0, writable: !0 });
		else D[u] = F;
		return D;
	}
	function G9(D, u) {
		var F = (typeof Symbol < 'u' && D[Symbol.iterator]) || D['@@iterator'];
		if (!F) {
			if (Array.isArray(D) || (F = K9(D)) || (u && D && typeof D.length === 'number')) {
				if (F) D = F;
				var E = 0,
					B = function () {};
				return {
					s: B,
					n: function () {
						if (E >= D.length) return { done: !0 };
						return { done: !1, value: D[E++] };
					},
					e: function (Z) {
						throw Z;
					},
					f: B
				};
			}
			throw TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
		}
		var C = !0,
			A = !1,
			_;
		return {
			s: function () {
				F = F.call(D);
			},
			n: function () {
				var Z = F.next();
				return ((C = Z.done), Z);
			},
			e: function (Z) {
				((A = !0), (_ = Z));
			},
			f: function () {
				try {
					if (!C && F.return != null) F.return();
				} finally {
					if (A) throw _;
				}
			}
		};
	}
	function K9(D, u) {
		if (!D) return;
		if (typeof D === 'string') return Y6(D, u);
		var F = Object.prototype.toString.call(D).slice(8, -1);
		if (F === 'Object' && D.constructor) F = D.constructor.name;
		if (F === 'Map' || F === 'Set') return Array.from(D);
		if (F === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(F)) return Y6(D, u);
	}
	function Y6(D, u) {
		if (u == null || u > D.length) u = D.length;
		for (var F = 0, E = Array(u); F < u; F++) E[F] = D[F];
		return E;
	}
	function z6(D, u, F, E, B, C, A) {
		try {
			var _ = D[C](A),
				$ = _.value;
		} catch (Z) {
			F(Z);
			return;
		}
		if (_.done) u($);
		else Promise.resolve($).then(E, B);
	}
	function H6(D) {
		return function () {
			var u = this,
				F = arguments;
			return new Promise(function (E, B) {
				var C = D.apply(u, F);
				function A($) {
					z6(C, E, B, A, _, 'next', $);
				}
				function _($) {
					z6(C, E, B, A, _, 'throw', $);
				}
				A(void 0);
			});
		};
	}
	var CF = $6(),
		U9 = ['suggest', 'format', 'onState', 'validate', 'onRender', 'type'],
		J6 = () => {};
	function ID() {
		return AF.apply(this, arguments);
	}
	function AF() {
		return (
			(AF = H6(function* (D = [], { onSubmit: u = J6, onCancel: F = J6 } = {}) {
				let E = {},
					B = ID._override || {};
				D = [].concat(D);
				let C,
					A,
					_,
					$,
					Z,
					z,
					J = (function () {
						var M = H6(function* (W, L, x = !1) {
							if (!x && W.validate && W.validate(L) !== !0) return;
							return W.format ? yield W.format(L, E) : L;
						});
						return function (L, x) {
							return M.apply(this, arguments);
						};
					})();
				var Q = G9(D),
					Y;
				try {
					for (Q.s(); !(Y = Q.n()).done; ) {
						A = Y.value;
						var H = A;
						if ((($ = H.name), (Z = H.type), typeof Z === 'function'))
							((Z = yield Z(C, X6({}, E), A)), (A.type = Z));
						if (!Z) continue;
						for (let M in A) {
							if (U9.includes(M)) continue;
							let W = A[M];
							A[M] = typeof W === 'function' ? yield W(C, X6({}, E), z) : W;
						}
						if (((z = A), typeof A.message !== 'string')) throw Error('prompt message is required');
						var K = A;
						if ((($ = K.name), (Z = K.type), CF[Z] === void 0))
							throw Error(`prompt type (${Z}) is not defined`);
						if (B[A.name] !== void 0) {
							if (((C = yield J(A, B[A.name])), C !== void 0)) {
								E[$] = C;
								continue;
							}
						}
						try {
							((C = ID._injected ? M9(ID._injected, A.initial) : yield CF[Z](A)),
								(E[$] = C = yield J(A, C, !0)),
								(_ = yield u(A, C, E)));
						} catch (M) {
							_ = !(yield F(A, E));
						}
						if (_) return E;
					}
				} catch (M) {
					Q.e(M);
				} finally {
					Q.f();
				}
				return E;
			})),
			AF.apply(this, arguments)
		);
	}
	function M9(D, u) {
		let F = D.shift();
		if (F instanceof Error) throw F;
		return F === void 0 ? u : F;
	}
	function W9(D) {
		ID._injected = (ID._injected || []).concat(D);
	}
	function R9(D) {
		ID._override = Object.assign({}, D);
	}
	Q6.exports = Object.assign(ID, { prompt: ID, prompts: CF, inject: W9, override: R9 });
});
var U6 = G((_Z, K6) => {
	K6.exports = (D, u) => {
		if (D.meta && D.name !== 'escape') return;
		if (D.ctrl) {
			if (D.name === 'a') return 'first';
			if (D.name === 'c') return 'abort';
			if (D.name === 'd') return 'abort';
			if (D.name === 'e') return 'last';
			if (D.name === 'g') return 'reset';
		}
		if (u) {
			if (D.name === 'j') return 'down';
			if (D.name === 'k') return 'up';
		}
		if (D.name === 'return') return 'submit';
		if (D.name === 'enter') return 'submit';
		if (D.name === 'backspace') return 'delete';
		if (D.name === 'delete') return 'deleteForward';
		if (D.name === 'abort') return 'abort';
		if (D.name === 'escape') return 'exit';
		if (D.name === 'tab') return 'next';
		if (D.name === 'pagedown') return 'nextPage';
		if (D.name === 'pageup') return 'prevPage';
		if (D.name === 'home') return 'home';
		if (D.name === 'end') return 'end';
		if (D.name === 'up') return 'up';
		if (D.name === 'down') return 'down';
		if (D.name === 'right') return 'right';
		if (D.name === 'left') return 'left';
		return !1;
	};
});
var c0 = G(($Z, M6) => {
	M6.exports = (D) => {
		let u = [
				'[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
				'(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))'
			].join('|'),
			F = new RegExp(u, 'g');
		return typeof D === 'string' ? D.replace(F, '') : D;
	};
});
var q6 = G((ZZ, R6) => {
	var q9 = c0(),
		{ erase: W6, cursor: L9 } = w(),
		V9 = (D) => [...q9(D)].length;
	R6.exports = function (D, u) {
		if (!u) return W6.line + L9.to(0);
		let F = 0,
			E = D.split(/\r?\n/);
		for (let B of E) F += 1 + Math.floor(Math.max(V9(B) - 1, 0) / u);
		return W6.lines(F);
	};
});
var _F = G((XZ, L6) => {
	var Y0 = {
			arrowUp: '\u2191',
			arrowDown: '\u2193',
			arrowLeft: '\u2190',
			arrowRight: '\u2192',
			radioOn: '\u25C9',
			radioOff: '\u25EF',
			tick: '\u2714',
			cross: '\u2716',
			ellipsis: '\u2026',
			pointerSmall: '\u203A',
			line: '\u2500',
			pointer: '\u276F'
		},
		N9 = {
			arrowUp: Y0.arrowUp,
			arrowDown: Y0.arrowDown,
			arrowLeft: Y0.arrowLeft,
			arrowRight: Y0.arrowRight,
			radioOn: '(*)',
			radioOff: '( )',
			tick: '\u221A',
			cross: '\xD7',
			ellipsis: '...',
			pointerSmall: '\xBB',
			line: '\u2500',
			pointer: '>'
		},
		T9 = process.platform === 'win32' ? N9 : Y0;
	L6.exports = T9;
});
var N6 = G((YZ, V6) => {
	var cD = S(),
		bD = _F(),
		$F = Object.freeze({
			password: { scale: 1, render: (D) => '*'.repeat(D.length) },
			emoji: { scale: 2, render: (D) => '\uD83D\uDE03'.repeat(D.length) },
			invisible: { scale: 0, render: (D) => '' },
			default: { scale: 1, render: (D) => `${D}` }
		}),
		I9 = (D) => $F[D] || $F.default,
		z0 = Object.freeze({
			aborted: cD.red(bD.cross),
			done: cD.green(bD.tick),
			exited: cD.yellow(bD.cross),
			default: cD.cyan('?')
		}),
		j9 = (D, u, F) => (u ? z0.aborted : F ? z0.exited : D ? z0.done : z0.default),
		O9 = (D) => cD.gray(D ? bD.ellipsis : bD.pointerSmall),
		P9 = (D, u) => cD.gray(D ? (u ? bD.pointerSmall : '+') : bD.line);
	V6.exports = { styles: $F, render: I9, symbols: z0, symbol: j9, delimiter: O9, item: P9 };
});
var I6 = G((zZ, T6) => {
	var S9 = c0();
	T6.exports = function (D, u) {
		let F = String(S9(D) || '').split(/\r?\n/);
		if (!u) return F.length;
		return F.map((E) => Math.ceil(E.length / u)).reduce((E, B) => E + B);
	};
});
var O6 = G((HZ, j6) => {
	j6.exports = (D, u = {}) => {
		let F = Number.isSafeInteger(parseInt(u.margin))
				? Array(parseInt(u.margin)).fill(' ').join('')
				: u.margin || '',
			E = u.width;
		return (D || '').split(/\r?\n/g).map((B) =>
			B.split(/\s+/g).reduce(
				(C, A) => {
					if (A.length + F.length >= E || C[C.length - 1].length + A.length + 1 < E)
						C[C.length - 1] += ` ${A}`;
					else C.push(`${F}${A}`);
					return C;
				},
				[F]
			).join(`
`)
		).join(`
`);
	};
});
var S6 = G((JZ, P6) => {
	P6.exports = (D, u, F) => {
		F = F || u;
		let E = Math.min(u - F, D - Math.floor(F / 2));
		if (E < 0) E = 0;
		let B = Math.min(E + F, u);
		return { startIndex: E, endIndex: B };
	};
});
var e = G((QZ, w6) => {
	w6.exports = {
		action: U6(),
		clear: q6(),
		style: N6(),
		strip: c0(),
		figures: _F(),
		lines: I6(),
		wrap: O6(),
		entriesToDisplay: S6()
	};
});
var RD = G((GZ, x6) => {
	var b6 = uD('readline'),
		{ action: w9 } = e(),
		b9 = uD('events'),
		{ beep: k9, cursor: x9 } = w(),
		v9 = S();
	class k6 extends b9 {
		constructor(D = {}) {
			super();
			((this.firstRender = !0),
				(this.in = D.stdin || process.stdin),
				(this.out = D.stdout || process.stdout),
				(this.onRender = (
					D.onRender ||
					(() => {
						return;
					})
				).bind(this)));
			let u = b6.createInterface({ input: this.in, escapeCodeTimeout: 50 });
			if ((b6.emitKeypressEvents(this.in, u), this.in.isTTY)) this.in.setRawMode(!0);
			let F = ['SelectPrompt', 'MultiselectPrompt'].indexOf(this.constructor.name) > -1,
				E = (B, C) => {
					let A = w9(C, F);
					if (A === !1) this._ && this._(B, C);
					else if (typeof this[A] === 'function') this[A](C);
					else this.bell();
				};
			((this.close = () => {
				if ((this.out.write(x9.show), this.in.removeListener('keypress', E), this.in.isTTY))
					this.in.setRawMode(!1);
				(u.close(),
					this.emit(this.aborted ? 'abort' : this.exited ? 'exit' : 'submit', this.value),
					(this.closed = !0));
			}),
				this.in.on('keypress', E));
		}
		fire() {
			this.emit('state', { value: this.value, aborted: !!this.aborted, exited: !!this.exited });
		}
		bell() {
			this.out.write(k9);
		}
		render() {
			if ((this.onRender(v9), this.firstRender)) this.firstRender = !1;
		}
	}
	x6.exports = k6;
});
var h6 = G((KZ, y6) => {
	var l0 = S(),
		y9 = RD(),
		{ erase: h9, cursor: H0 } = w(),
		{ style: ZF, clear: XF, lines: f9, figures: g9 } = e();
	class v6 extends y9 {
		constructor(D = {}) {
			super(D);
			((this.transform = ZF.render(D.style)),
				(this.scale = this.transform.scale),
				(this.msg = D.message),
				(this.initial = D.initial || ''),
				(this.validator = D.validate || (() => !0)),
				(this.value = ''),
				(this.errorMsg = D.error || 'Please Enter A Valid Value'),
				(this.cursor = Number(!!this.initial)),
				(this.cursorOffset = 0),
				(this.clear = XF('', this.out.columns)),
				this.render());
		}
		set value(D) {
			if (!D && this.initial)
				((this.placeholder = !0), (this.rendered = l0.gray(this.transform.render(this.initial))));
			else ((this.placeholder = !1), (this.rendered = this.transform.render(D)));
			((this._value = D), this.fire());
		}
		get value() {
			return this._value;
		}
		reset() {
			((this.value = ''),
				(this.cursor = Number(!!this.initial)),
				(this.cursorOffset = 0),
				this.fire(),
				this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.value = this.value || this.initial),
				(this.done = this.aborted = !0),
				(this.error = !1),
				(this.red = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		async validate() {
			let D = await this.validator(this.value);
			if (typeof D === 'string') ((this.errorMsg = D), (D = !1));
			this.error = !D;
		}
		async submit() {
			if (
				((this.value = this.value || this.initial),
				(this.cursorOffset = 0),
				(this.cursor = this.rendered.length),
				await this.validate(),
				this.error)
			) {
				((this.red = !0), this.fire(), this.render());
				return;
			}
			((this.done = !0),
				(this.aborted = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		next() {
			if (!this.placeholder) return this.bell();
			((this.value = this.initial),
				(this.cursor = this.rendered.length),
				this.fire(),
				this.render());
		}
		moveCursor(D) {
			if (this.placeholder) return;
			((this.cursor = this.cursor + D), (this.cursorOffset += D));
		}
		_(D, u) {
			let F = this.value.slice(0, this.cursor),
				E = this.value.slice(this.cursor);
			((this.value = `${F}${D}${E}`),
				(this.red = !1),
				(this.cursor = this.placeholder ? 0 : F.length + 1),
				this.render());
		}
		delete() {
			if (this.isCursorAtStart()) return this.bell();
			let D = this.value.slice(0, this.cursor - 1),
				u = this.value.slice(this.cursor);
			if (((this.value = `${D}${u}`), (this.red = !1), this.isCursorAtStart()))
				this.cursorOffset = 0;
			else (this.cursorOffset++, this.moveCursor(-1));
			this.render();
		}
		deleteForward() {
			if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
			let D = this.value.slice(0, this.cursor),
				u = this.value.slice(this.cursor + 1);
			if (((this.value = `${D}${u}`), (this.red = !1), this.isCursorAtEnd())) this.cursorOffset = 0;
			else this.cursorOffset++;
			this.render();
		}
		first() {
			((this.cursor = 0), this.render());
		}
		last() {
			((this.cursor = this.value.length), this.render());
		}
		left() {
			if (this.cursor <= 0 || this.placeholder) return this.bell();
			(this.moveCursor(-1), this.render());
		}
		right() {
			if (this.cursor * this.scale >= this.rendered.length || this.placeholder) return this.bell();
			(this.moveCursor(1), this.render());
		}
		isCursorAtStart() {
			return this.cursor === 0 || (this.placeholder && this.cursor === 1);
		}
		isCursorAtEnd() {
			return (
				this.cursor === this.rendered.length ||
				(this.placeholder && this.cursor === this.rendered.length + 1)
			);
		}
		render() {
			if (this.closed) return;
			if (!this.firstRender) {
				if (this.outputError)
					this.out.write(
						H0.down(f9(this.outputError, this.out.columns) - 1) +
							XF(this.outputError, this.out.columns)
					);
				this.out.write(XF(this.outputText, this.out.columns));
			}
			if (
				(super.render(),
				(this.outputError = ''),
				(this.outputText = [
					ZF.symbol(this.done, this.aborted),
					l0.bold(this.msg),
					ZF.delimiter(this.done),
					this.red ? l0.red(this.rendered) : this.rendered
				].join(' ')),
				this.error)
			)
				this.outputError += this.errorMsg
					.split(
						`
`
					)
					.reduce(
						(D, u, F) =>
							D +
							`
${F ? ' ' : g9.pointerSmall} ${l0.red().italic(u)}`,
						''
					);
			this.out.write(
				h9.line +
					H0.to(0) +
					this.outputText +
					H0.save +
					this.outputError +
					H0.restore +
					H0.move(this.cursorOffset, 0)
			);
		}
	}
	y6.exports = v6;
});
var c6 = G((UZ, d6) => {
	var qD = S(),
		m9 = RD(),
		{ style: f6, clear: g6, figures: p0, wrap: d9, entriesToDisplay: c9 } = e(),
		{ cursor: l9 } = w();
	class m6 extends m9 {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.hint = D.hint || '- Use arrow-keys. Return to submit.'),
				(this.warn = D.warn || '- This option is disabled'),
				(this.cursor = D.initial || 0),
				(this.choices = D.choices.map((u, F) => {
					if (typeof u === 'string') u = { title: u, value: F };
					return {
						title: u && (u.title || u.value || u),
						value: u && (u.value === void 0 ? F : u.value),
						description: u && u.description,
						selected: u && u.selected,
						disabled: u && u.disabled
					};
				})),
				(this.optionsPerPage = D.optionsPerPage || 10),
				(this.value = (this.choices[this.cursor] || {}).value),
				(this.clear = g6('', this.out.columns)),
				this.render());
		}
		moveCursor(D) {
			((this.cursor = D), (this.value = this.choices[D].value), this.fire());
		}
		reset() {
			(this.moveCursor(0), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			if (!this.selection.disabled)
				((this.done = !0),
					(this.aborted = !1),
					this.fire(),
					this.render(),
					this.out.write(`
`),
					this.close());
			else this.bell();
		}
		first() {
			(this.moveCursor(0), this.render());
		}
		last() {
			(this.moveCursor(this.choices.length - 1), this.render());
		}
		up() {
			if (this.cursor === 0) this.moveCursor(this.choices.length - 1);
			else this.moveCursor(this.cursor - 1);
			this.render();
		}
		down() {
			if (this.cursor === this.choices.length - 1) this.moveCursor(0);
			else this.moveCursor(this.cursor + 1);
			this.render();
		}
		next() {
			(this.moveCursor((this.cursor + 1) % this.choices.length), this.render());
		}
		_(D, u) {
			if (D === ' ') return this.submit();
		}
		get selection() {
			return this.choices[this.cursor];
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(l9.hide);
			else this.out.write(g6(this.outputText, this.out.columns));
			super.render();
			let { startIndex: D, endIndex: u } = c9(
				this.cursor,
				this.choices.length,
				this.optionsPerPage
			);
			if (
				((this.outputText = [
					f6.symbol(this.done, this.aborted),
					qD.bold(this.msg),
					f6.delimiter(!1),
					this.done
						? this.selection.title
						: this.selection.disabled
							? qD.yellow(this.warn)
							: qD.gray(this.hint)
				].join(' ')),
				!this.done)
			) {
				this.outputText += `
`;
				for (let F = D; F < u; F++) {
					let E,
						B,
						C = '',
						A = this.choices[F];
					if (F === D && D > 0) B = p0.arrowUp;
					else if (F === u - 1 && u < this.choices.length) B = p0.arrowDown;
					else B = ' ';
					if (A.disabled)
						((E =
							this.cursor === F ? qD.gray().underline(A.title) : qD.strikethrough().gray(A.title)),
							(B = (this.cursor === F ? qD.bold().gray(p0.pointer) + ' ' : '  ') + B));
					else if (
						((E = this.cursor === F ? qD.cyan().underline(A.title) : A.title),
						(B = (this.cursor === F ? qD.cyan(p0.pointer) + ' ' : '  ') + B),
						A.description && this.cursor === F)
					) {
						if (
							((C = ` - ${A.description}`),
							B.length + E.length + C.length >= this.out.columns ||
								A.description.split(/\r?\n/).length > 1)
						)
							C =
								`
` + d9(A.description, { margin: 3, width: this.out.columns });
					}
					this.outputText += `${B} ${E}${qD.gray(C)}
`;
				}
			}
			this.out.write(this.outputText);
		}
	}
	d6.exports = m6;
});
var n6 = G((MZ, i6) => {
	var a0 = S(),
		p9 = RD(),
		{ style: l6, clear: a9 } = e(),
		{ cursor: p6, erase: i9 } = w();
	class a6 extends p9 {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.value = !!D.initial),
				(this.active = D.active || 'on'),
				(this.inactive = D.inactive || 'off'),
				(this.initialValue = this.value),
				this.render());
		}
		reset() {
			((this.value = this.initialValue), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			((this.done = !0),
				(this.aborted = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		deactivate() {
			if (this.value === !1) return this.bell();
			((this.value = !1), this.render());
		}
		activate() {
			if (this.value === !0) return this.bell();
			((this.value = !0), this.render());
		}
		delete() {
			this.deactivate();
		}
		left() {
			this.deactivate();
		}
		right() {
			this.activate();
		}
		down() {
			this.deactivate();
		}
		up() {
			this.activate();
		}
		next() {
			((this.value = !this.value), this.fire(), this.render());
		}
		_(D, u) {
			if (D === ' ') this.value = !this.value;
			else if (D === '1') this.value = !0;
			else if (D === '0') this.value = !1;
			else return this.bell();
			this.render();
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(p6.hide);
			else this.out.write(a9(this.outputText, this.out.columns));
			(super.render(),
				(this.outputText = [
					l6.symbol(this.done, this.aborted),
					a0.bold(this.msg),
					l6.delimiter(this.done),
					this.value ? this.inactive : a0.cyan().underline(this.inactive),
					a0.gray('/'),
					this.value ? a0.cyan().underline(this.active) : this.active
				].join(' ')),
				this.out.write(i9.line + p6.to(0) + this.outputText));
		}
	}
	i6.exports = a6;
});
var YD = G((WZ, s6) => {
	class i0 {
		constructor({ token: D, date: u, parts: F, locales: E }) {
			((this.token = D),
				(this.date = u || new Date()),
				(this.parts = F || [this]),
				(this.locales = E || {}));
		}
		up() {}
		down() {}
		next() {
			let D = this.parts.indexOf(this);
			return this.parts.find((u, F) => F > D && u instanceof i0);
		}
		setTo(D) {}
		prev() {
			let D = [].concat(this.parts).reverse(),
				u = D.indexOf(this);
			return D.find((F, E) => E > u && F instanceof i0);
		}
		toString() {
			return String(this.date);
		}
	}
	s6.exports = i0;
});
var o6 = G((RZ, t6) => {
	var n9 = YD();
	class r6 extends n9 {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setHours((this.date.getHours() + 12) % 24);
		}
		down() {
			this.up();
		}
		toString() {
			let D = this.date.getHours() > 12 ? 'pm' : 'am';
			return /\A/.test(this.token) ? D.toUpperCase() : D;
		}
	}
	t6.exports = r6;
});
var uE = G((qZ, DE) => {
	var s9 = YD(),
		r9 = (D) => {
			return ((D = D % 10), D === 1 ? 'st' : D === 2 ? 'nd' : D === 3 ? 'rd' : 'th');
		};
	class e6 extends s9 {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setDate(this.date.getDate() + 1);
		}
		down() {
			this.date.setDate(this.date.getDate() - 1);
		}
		setTo(D) {
			this.date.setDate(parseInt(D.substr(-2)));
		}
		toString() {
			let D = this.date.getDate(),
				u = this.date.getDay();
			return this.token === 'DD'
				? String(D).padStart(2, '0')
				: this.token === 'Do'
					? D + r9(D)
					: this.token === 'd'
						? u + 1
						: this.token === 'ddd'
							? this.locales.weekdaysShort[u]
							: this.token === 'dddd'
								? this.locales.weekdays[u]
								: D;
		}
	}
	DE.exports = e6;
});
var BE = G((LZ, EE) => {
	var t9 = YD();
	class FE extends t9 {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setHours(this.date.getHours() + 1);
		}
		down() {
			this.date.setHours(this.date.getHours() - 1);
		}
		setTo(D) {
			this.date.setHours(parseInt(D.substr(-2)));
		}
		toString() {
			let D = this.date.getHours();
			if (/h/.test(this.token)) D = D % 12 || 12;
			return this.token.length > 1 ? String(D).padStart(2, '0') : D;
		}
	}
	EE.exports = FE;
});
var _E = G((VZ, AE) => {
	var o9 = YD();
	class CE extends o9 {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setMilliseconds(this.date.getMilliseconds() + 1);
		}
		down() {
			this.date.setMilliseconds(this.date.getMilliseconds() - 1);
		}
		setTo(D) {
			this.date.setMilliseconds(parseInt(D.substr(-this.token.length)));
		}
		toString() {
			return String(this.date.getMilliseconds()).padStart(4, '0').substr(0, this.token.length);
		}
	}
	AE.exports = CE;
});
var XE = G((NZ, ZE) => {
	var e9 = YD();
	class $E extends e9 {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setMinutes(this.date.getMinutes() + 1);
		}
		down() {
			this.date.setMinutes(this.date.getMinutes() - 1);
		}
		setTo(D) {
			this.date.setMinutes(parseInt(D.substr(-2)));
		}
		toString() {
			let D = this.date.getMinutes();
			return this.token.length > 1 ? String(D).padStart(2, '0') : D;
		}
	}
	ZE.exports = $E;
});
var HE = G((TZ, zE) => {
	var D4 = YD();
	class YE extends D4 {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setMonth(this.date.getMonth() + 1);
		}
		down() {
			this.date.setMonth(this.date.getMonth() - 1);
		}
		setTo(D) {
			((D = parseInt(D.substr(-2)) - 1), this.date.setMonth(D < 0 ? 0 : D));
		}
		toString() {
			let D = this.date.getMonth(),
				u = this.token.length;
			return u === 2
				? String(D + 1).padStart(2, '0')
				: u === 3
					? this.locales.monthsShort[D]
					: u === 4
						? this.locales.months[D]
						: String(D + 1);
		}
	}
	zE.exports = YE;
});
var GE = G((IZ, QE) => {
	var u4 = YD();
	class JE extends u4 {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setSeconds(this.date.getSeconds() + 1);
		}
		down() {
			this.date.setSeconds(this.date.getSeconds() - 1);
		}
		setTo(D) {
			this.date.setSeconds(parseInt(D.substr(-2)));
		}
		toString() {
			let D = this.date.getSeconds();
			return this.token.length > 1 ? String(D).padStart(2, '0') : D;
		}
	}
	QE.exports = JE;
});
var ME = G((jZ, UE) => {
	var F4 = YD();
	class KE extends F4 {
		constructor(D = {}) {
			super(D);
		}
		up() {
			this.date.setFullYear(this.date.getFullYear() + 1);
		}
		down() {
			this.date.setFullYear(this.date.getFullYear() - 1);
		}
		setTo(D) {
			this.date.setFullYear(D.substr(-4));
		}
		toString() {
			let D = String(this.date.getFullYear()).padStart(4, '0');
			return this.token.length === 2 ? D.substr(-2) : D;
		}
	}
	UE.exports = KE;
});
var RE = G((OZ, WE) => {
	WE.exports = {
		DatePart: YD(),
		Meridiem: o6(),
		Day: uE(),
		Hours: BE(),
		Milliseconds: _E(),
		Minutes: XE(),
		Month: HE(),
		Seconds: GE(),
		Year: ME()
	};
});
var OE = G((PZ, jE) => {
	var YF = S(),
		E4 = RD(),
		{ style: qE, clear: LE, figures: B4 } = e(),
		{ erase: C4, cursor: VE } = w(),
		{
			DatePart: NE,
			Meridiem: A4,
			Day: _4,
			Hours: $4,
			Milliseconds: Z4,
			Minutes: X4,
			Month: Y4,
			Seconds: z4,
			Year: H4
		} = RE(),
		J4 =
			/\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g,
		TE = {
			1: ({ token: D }) => D.replace(/\\(.)/g, '$1'),
			2: (D) => new _4(D),
			3: (D) => new Y4(D),
			4: (D) => new H4(D),
			5: (D) => new A4(D),
			6: (D) => new $4(D),
			7: (D) => new X4(D),
			8: (D) => new z4(D),
			9: (D) => new Z4(D)
		},
		Q4 = {
			months:
				'January,February,March,April,May,June,July,August,September,October,November,December'.split(
					','
				),
			monthsShort: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(','),
			weekdays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(','),
			weekdaysShort: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat'.split(',')
		};
	class IE extends E4 {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.cursor = 0),
				(this.typed = ''),
				(this.locales = Object.assign(Q4, D.locales)),
				(this._date = D.initial || new Date()),
				(this.errorMsg = D.error || 'Please Enter A Valid Value'),
				(this.validator = D.validate || (() => !0)),
				(this.mask = D.mask || 'YYYY-MM-DD HH:mm:ss'),
				(this.clear = LE('', this.out.columns)),
				this.render());
		}
		get value() {
			return this.date;
		}
		get date() {
			return this._date;
		}
		set date(D) {
			if (D) this._date.setTime(D.getTime());
		}
		set mask(D) {
			let u;
			this.parts = [];
			while ((u = J4.exec(D))) {
				let E = u.shift(),
					B = u.findIndex((C) => C != null);
				this.parts.push(
					B in TE
						? TE[B]({ token: u[B] || E, date: this.date, parts: this.parts, locales: this.locales })
						: u[B] || E
				);
			}
			let F = this.parts.reduce((E, B) => {
				if (typeof B === 'string' && typeof E[E.length - 1] === 'string') E[E.length - 1] += B;
				else E.push(B);
				return E;
			}, []);
			(this.parts.splice(0), this.parts.push(...F), this.reset());
		}
		moveCursor(D) {
			((this.typed = ''), (this.cursor = D), this.fire());
		}
		reset() {
			(this.moveCursor(this.parts.findIndex((D) => D instanceof NE)), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				(this.error = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		async validate() {
			let D = await this.validator(this.value);
			if (typeof D === 'string') ((this.errorMsg = D), (D = !1));
			this.error = !D;
		}
		async submit() {
			if ((await this.validate(), this.error)) {
				((this.color = 'red'), this.fire(), this.render());
				return;
			}
			((this.done = !0),
				(this.aborted = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		up() {
			((this.typed = ''), this.parts[this.cursor].up(), this.render());
		}
		down() {
			((this.typed = ''), this.parts[this.cursor].down(), this.render());
		}
		left() {
			let D = this.parts[this.cursor].prev();
			if (D == null) return this.bell();
			(this.moveCursor(this.parts.indexOf(D)), this.render());
		}
		right() {
			let D = this.parts[this.cursor].next();
			if (D == null) return this.bell();
			(this.moveCursor(this.parts.indexOf(D)), this.render());
		}
		next() {
			let D = this.parts[this.cursor].next();
			(this.moveCursor(D ? this.parts.indexOf(D) : this.parts.findIndex((u) => u instanceof NE)),
				this.render());
		}
		_(D) {
			if (/\d/.test(D))
				((this.typed += D), this.parts[this.cursor].setTo(this.typed), this.render());
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(VE.hide);
			else this.out.write(LE(this.outputText, this.out.columns));
			if (
				(super.render(),
				(this.outputText = [
					qE.symbol(this.done, this.aborted),
					YF.bold(this.msg),
					qE.delimiter(!1),
					this.parts
						.reduce(
							(D, u, F) =>
								D.concat(F === this.cursor && !this.done ? YF.cyan().underline(u.toString()) : u),
							[]
						)
						.join('')
				].join(' ')),
				this.error)
			)
				this.outputText += this.errorMsg
					.split(
						`
`
					)
					.reduce(
						(D, u, F) =>
							D +
							`
${F ? ' ' : B4.pointerSmall} ${YF.red().italic(u)}`,
						''
					);
			this.out.write(C4.line + VE.to(0) + this.outputText);
		}
	}
	jE.exports = IE;
});
var kE = G((SZ, bE) => {
	var n0 = S(),
		G4 = RD(),
		{ cursor: s0, erase: K4 } = w(),
		{ style: zF, figures: U4, clear: PE, lines: M4 } = e(),
		W4 = /[0-9]/,
		HF = (D) => D !== void 0,
		SE = (D, u) => {
			let F = Math.pow(10, u);
			return Math.round(D * F) / F;
		};
	class wE extends G4 {
		constructor(D = {}) {
			super(D);
			((this.transform = zF.render(D.style)),
				(this.msg = D.message),
				(this.initial = HF(D.initial) ? D.initial : ''),
				(this.float = !!D.float),
				(this.round = D.round || 2),
				(this.inc = D.increment || 1),
				(this.min = HF(D.min) ? D.min : -1 / 0),
				(this.max = HF(D.max) ? D.max : 1 / 0),
				(this.errorMsg = D.error || 'Please Enter A Valid Value'),
				(this.validator = D.validate || (() => !0)),
				(this.color = 'cyan'),
				(this.value = ''),
				(this.typed = ''),
				(this.lastHit = 0),
				this.render());
		}
		set value(D) {
			if (!D && D !== 0)
				((this.placeholder = !0),
					(this.rendered = n0.gray(this.transform.render(`${this.initial}`))),
					(this._value = ''));
			else
				((this.placeholder = !1),
					(this.rendered = this.transform.render(`${SE(D, this.round)}`)),
					(this._value = SE(D, this.round)));
			this.fire();
		}
		get value() {
			return this._value;
		}
		parse(D) {
			return this.float ? parseFloat(D) : parseInt(D);
		}
		valid(D) {
			return D === '-' || (D === '.' && this.float) || W4.test(D);
		}
		reset() {
			((this.typed = ''), (this.value = ''), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			let D = this.value;
			((this.value = D !== '' ? D : this.initial),
				(this.done = this.aborted = !0),
				(this.error = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		async validate() {
			let D = await this.validator(this.value);
			if (typeof D === 'string') ((this.errorMsg = D), (D = !1));
			this.error = !D;
		}
		async submit() {
			if ((await this.validate(), this.error)) {
				((this.color = 'red'), this.fire(), this.render());
				return;
			}
			let D = this.value;
			((this.value = D !== '' ? D : this.initial),
				(this.done = !0),
				(this.aborted = !1),
				(this.error = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		up() {
			if (((this.typed = ''), this.value === '')) this.value = this.min - this.inc;
			if (this.value >= this.max) return this.bell();
			((this.value += this.inc), (this.color = 'cyan'), this.fire(), this.render());
		}
		down() {
			if (((this.typed = ''), this.value === '')) this.value = this.min + this.inc;
			if (this.value <= this.min) return this.bell();
			((this.value -= this.inc), (this.color = 'cyan'), this.fire(), this.render());
		}
		delete() {
			let D = this.value.toString();
			if (D.length === 0) return this.bell();
			if (
				((this.value = this.parse((D = D.slice(0, -1))) || ''),
				this.value !== '' && this.value < this.min)
			)
				this.value = this.min;
			((this.color = 'cyan'), this.fire(), this.render());
		}
		next() {
			((this.value = this.initial), this.fire(), this.render());
		}
		_(D, u) {
			if (!this.valid(D)) return this.bell();
			let F = Date.now();
			if (F - this.lastHit > 1000) this.typed = '';
			if (((this.typed += D), (this.lastHit = F), (this.color = 'cyan'), D === '.'))
				return this.fire();
			if (((this.value = Math.min(this.parse(this.typed), this.max)), this.value > this.max))
				this.value = this.max;
			if (this.value < this.min) this.value = this.min;
			(this.fire(), this.render());
		}
		render() {
			if (this.closed) return;
			if (!this.firstRender) {
				if (this.outputError)
					this.out.write(
						s0.down(M4(this.outputError, this.out.columns) - 1) +
							PE(this.outputError, this.out.columns)
					);
				this.out.write(PE(this.outputText, this.out.columns));
			}
			if (
				(super.render(),
				(this.outputError = ''),
				(this.outputText = [
					zF.symbol(this.done, this.aborted),
					n0.bold(this.msg),
					zF.delimiter(this.done),
					!this.done || (!this.done && !this.placeholder)
						? n0[this.color]().underline(this.rendered)
						: this.rendered
				].join(' ')),
				this.error)
			)
				this.outputError += this.errorMsg
					.split(
						`
`
					)
					.reduce(
						(D, u, F) =>
							D +
							`
${F ? ' ' : U4.pointerSmall} ${n0.red().italic(u)}`,
						''
					);
			this.out.write(
				K4.line + s0.to(0) + this.outputText + s0.save + this.outputError + s0.restore
			);
		}
	}
	bE.exports = wE;
});
var JF = G((wZ, hE) => {
	var zD = S(),
		{ cursor: R4 } = w(),
		q4 = RD(),
		{ clear: xE, figures: jD, style: vE, wrap: L4, entriesToDisplay: V4 } = e();
	class yE extends q4 {
		constructor(D = {}) {
			super(D);
			if (
				((this.msg = D.message),
				(this.cursor = D.cursor || 0),
				(this.scrollIndex = D.cursor || 0),
				(this.hint = D.hint || ''),
				(this.warn = D.warn || '- This option is disabled -'),
				(this.minSelected = D.min),
				(this.showMinError = !1),
				(this.maxChoices = D.max),
				(this.instructions = D.instructions),
				(this.optionsPerPage = D.optionsPerPage || 10),
				(this.value = D.choices.map((u, F) => {
					if (typeof u === 'string') u = { title: u, value: F };
					return {
						title: u && (u.title || u.value || u),
						description: u && u.description,
						value: u && (u.value === void 0 ? F : u.value),
						selected: u && u.selected,
						disabled: u && u.disabled
					};
				})),
				(this.clear = xE('', this.out.columns)),
				!D.overrideRender)
			)
				this.render();
		}
		reset() {
			(this.value.map((D) => !D.selected), (this.cursor = 0), this.fire(), this.render());
		}
		selected() {
			return this.value.filter((D) => D.selected);
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			let D = this.value.filter((u) => u.selected);
			if (this.minSelected && D.length < this.minSelected)
				((this.showMinError = !0), this.render());
			else
				((this.done = !0),
					(this.aborted = !1),
					this.fire(),
					this.render(),
					this.out.write(`
`),
					this.close());
		}
		first() {
			((this.cursor = 0), this.render());
		}
		last() {
			((this.cursor = this.value.length - 1), this.render());
		}
		next() {
			((this.cursor = (this.cursor + 1) % this.value.length), this.render());
		}
		up() {
			if (this.cursor === 0) this.cursor = this.value.length - 1;
			else this.cursor--;
			this.render();
		}
		down() {
			if (this.cursor === this.value.length - 1) this.cursor = 0;
			else this.cursor++;
			this.render();
		}
		left() {
			((this.value[this.cursor].selected = !1), this.render());
		}
		right() {
			if (this.value.filter((D) => D.selected).length >= this.maxChoices) return this.bell();
			((this.value[this.cursor].selected = !0), this.render());
		}
		handleSpaceToggle() {
			let D = this.value[this.cursor];
			if (D.selected) ((D.selected = !1), this.render());
			else if (D.disabled || this.value.filter((u) => u.selected).length >= this.maxChoices)
				return this.bell();
			else ((D.selected = !0), this.render());
		}
		toggleAll() {
			if (this.maxChoices !== void 0 || this.value[this.cursor].disabled) return this.bell();
			let D = !this.value[this.cursor].selected;
			(this.value.filter((u) => !u.disabled).forEach((u) => (u.selected = D)), this.render());
		}
		_(D, u) {
			if (D === ' ') this.handleSpaceToggle();
			else if (D === 'a') this.toggleAll();
			else return this.bell();
		}
		renderInstructions() {
			if (this.instructions === void 0 || this.instructions) {
				if (typeof this.instructions === 'string') return this.instructions;
				return (
					`
Instructions:
    ${jD.arrowUp}/${jD.arrowDown}: Highlight option
    ${jD.arrowLeft}/${jD.arrowRight}/[space]: Toggle selection
` +
					(this.maxChoices === void 0
						? `    a: Toggle all
`
						: '') +
					'    enter/return: Complete answer'
				);
			}
			return '';
		}
		renderOption(D, u, F, E) {
			let B = (u.selected ? zD.green(jD.radioOn) : jD.radioOff) + ' ' + E + ' ',
				C,
				A;
			if (u.disabled) C = D === F ? zD.gray().underline(u.title) : zD.strikethrough().gray(u.title);
			else if (((C = D === F ? zD.cyan().underline(u.title) : u.title), D === F && u.description)) {
				if (
					((A = ` - ${u.description}`),
					B.length + C.length + A.length >= this.out.columns ||
						u.description.split(/\r?\n/).length > 1)
				)
					A =
						`
` + L4(u.description, { margin: B.length, width: this.out.columns });
			}
			return B + C + zD.gray(A || '');
		}
		paginateOptions(D) {
			if (D.length === 0) return zD.red('No matches for this query.');
			let { startIndex: u, endIndex: F } = V4(this.cursor, D.length, this.optionsPerPage),
				E,
				B = [];
			for (let C = u; C < F; C++) {
				if (C === u && u > 0) E = jD.arrowUp;
				else if (C === F - 1 && F < D.length) E = jD.arrowDown;
				else E = ' ';
				B.push(this.renderOption(this.cursor, D[C], C, E));
			}
			return (
				`
` +
				B.join(`
`)
			);
		}
		renderOptions(D) {
			if (!this.done) return this.paginateOptions(D);
			return '';
		}
		renderDoneOrInstructions() {
			if (this.done)
				return this.value
					.filter((u) => u.selected)
					.map((u) => u.title)
					.join(', ');
			let D = [zD.gray(this.hint), this.renderInstructions()];
			if (this.value[this.cursor].disabled) D.push(zD.yellow(this.warn));
			return D.join(' ');
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(R4.hide);
			super.render();
			let D = [
				vE.symbol(this.done, this.aborted),
				zD.bold(this.msg),
				vE.delimiter(!1),
				this.renderDoneOrInstructions()
			].join(' ');
			if (this.showMinError)
				((D += zD.red(`You must select a minimum of ${this.minSelected} choices.`)),
					(this.showMinError = !1));
			((D += this.renderOptions(this.value)),
				this.out.write(this.clear + D),
				(this.clear = xE(D, this.out.columns)));
		}
	}
	hE.exports = yE;
});
var lE = G((bZ, cE) => {
	var J0 = S(),
		N4 = RD(),
		{ erase: T4, cursor: fE } = w(),
		{ style: QF, clear: gE, figures: GF, wrap: I4, entriesToDisplay: j4 } = e(),
		mE = (D, u) => D[u] && (D[u].value || D[u].title || D[u]),
		O4 = (D, u) => D[u] && (D[u].title || D[u].value || D[u]),
		P4 = (D, u) => {
			let F = D.findIndex((E) => E.value === u || E.title === u);
			return F > -1 ? F : void 0;
		};
	class dE extends N4 {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.suggest = D.suggest),
				(this.choices = D.choices),
				(this.initial = typeof D.initial === 'number' ? D.initial : P4(D.choices, D.initial)),
				(this.select = this.initial || D.cursor || 0),
				(this.i18n = { noMatches: D.noMatches || 'no matches found' }),
				(this.fallback = D.fallback || this.initial),
				(this.clearFirst = D.clearFirst || !1),
				(this.suggestions = []),
				(this.input = ''),
				(this.limit = D.limit || 10),
				(this.cursor = 0),
				(this.transform = QF.render(D.style)),
				(this.scale = this.transform.scale),
				(this.render = this.render.bind(this)),
				(this.complete = this.complete.bind(this)),
				(this.clear = gE('', this.out.columns)),
				this.complete(this.render),
				this.render());
		}
		set fallback(D) {
			this._fb = Number.isSafeInteger(parseInt(D)) ? parseInt(D) : D;
		}
		get fallback() {
			let D;
			if (typeof this._fb === 'number') D = this.choices[this._fb];
			else if (typeof this._fb === 'string') D = { title: this._fb };
			return D || this._fb || { title: this.i18n.noMatches };
		}
		moveSelect(D) {
			if (((this.select = D), this.suggestions.length > 0)) this.value = mE(this.suggestions, D);
			else this.value = this.fallback.value;
			this.fire();
		}
		async complete(D) {
			let u = (this.completing = this.suggest(this.input, this.choices)),
				F = await u;
			if (this.completing !== u) return;
			((this.suggestions = F.map((B, C, A) => ({
				title: O4(A, C),
				value: mE(A, C),
				description: B.description
			}))),
				(this.completing = !1));
			let E = Math.max(F.length - 1, 0);
			(this.moveSelect(Math.min(E, this.select)), D && D());
		}
		reset() {
			((this.input = ''),
				this.complete(() => {
					(this.moveSelect(this.initial !== void 0 ? this.initial : 0), this.render());
				}),
				this.render());
		}
		exit() {
			if (this.clearFirst && this.input.length > 0) this.reset();
			else
				((this.done = this.exited = !0),
					(this.aborted = !1),
					this.fire(),
					this.render(),
					this.out.write(`
`),
					this.close());
		}
		abort() {
			((this.done = this.aborted = !0),
				(this.exited = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			((this.done = !0),
				(this.aborted = this.exited = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		_(D, u) {
			let F = this.input.slice(0, this.cursor),
				E = this.input.slice(this.cursor);
			((this.input = `${F}${D}${E}`),
				(this.cursor = F.length + 1),
				this.complete(this.render),
				this.render());
		}
		delete() {
			if (this.cursor === 0) return this.bell();
			let D = this.input.slice(0, this.cursor - 1),
				u = this.input.slice(this.cursor);
			((this.input = `${D}${u}`),
				this.complete(this.render),
				(this.cursor = this.cursor - 1),
				this.render());
		}
		deleteForward() {
			if (this.cursor * this.scale >= this.rendered.length) return this.bell();
			let D = this.input.slice(0, this.cursor),
				u = this.input.slice(this.cursor + 1);
			((this.input = `${D}${u}`), this.complete(this.render), this.render());
		}
		first() {
			(this.moveSelect(0), this.render());
		}
		last() {
			(this.moveSelect(this.suggestions.length - 1), this.render());
		}
		up() {
			if (this.select === 0) this.moveSelect(this.suggestions.length - 1);
			else this.moveSelect(this.select - 1);
			this.render();
		}
		down() {
			if (this.select === this.suggestions.length - 1) this.moveSelect(0);
			else this.moveSelect(this.select + 1);
			this.render();
		}
		next() {
			if (this.select === this.suggestions.length - 1) this.moveSelect(0);
			else this.moveSelect(this.select + 1);
			this.render();
		}
		nextPage() {
			(this.moveSelect(Math.min(this.select + this.limit, this.suggestions.length - 1)),
				this.render());
		}
		prevPage() {
			(this.moveSelect(Math.max(this.select - this.limit, 0)), this.render());
		}
		left() {
			if (this.cursor <= 0) return this.bell();
			((this.cursor = this.cursor - 1), this.render());
		}
		right() {
			if (this.cursor * this.scale >= this.rendered.length) return this.bell();
			((this.cursor = this.cursor + 1), this.render());
		}
		renderOption(D, u, F, E) {
			let B,
				C = F ? GF.arrowUp : E ? GF.arrowDown : ' ',
				A = u ? J0.cyan().underline(D.title) : D.title;
			if (((C = (u ? J0.cyan(GF.pointer) + ' ' : '  ') + C), D.description)) {
				if (
					((B = ` - ${D.description}`),
					C.length + A.length + B.length >= this.out.columns ||
						D.description.split(/\r?\n/).length > 1)
				)
					B =
						`
` + I4(D.description, { margin: 3, width: this.out.columns });
			}
			return C + ' ' + A + J0.gray(B || '');
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(fE.hide);
			else this.out.write(gE(this.outputText, this.out.columns));
			super.render();
			let { startIndex: D, endIndex: u } = j4(this.select, this.choices.length, this.limit);
			if (
				((this.outputText = [
					QF.symbol(this.done, this.aborted, this.exited),
					J0.bold(this.msg),
					QF.delimiter(this.completing),
					this.done && this.suggestions[this.select]
						? this.suggestions[this.select].title
						: (this.rendered = this.transform.render(this.input))
				].join(' ')),
				!this.done)
			) {
				let F = this.suggestions
					.slice(D, u)
					.map((E, B) =>
						this.renderOption(
							E,
							this.select === B + D,
							B === 0 && D > 0,
							B + D === u - 1 && u < this.choices.length
						)
					).join(`
`);
				this.outputText +=
					`
` + (F || J0.gray(this.fallback.title));
			}
			this.out.write(T4.line + fE.to(0) + this.outputText);
		}
	}
	cE.exports = dE;
});
var sE = G((kZ, nE) => {
	var LD = S(),
		{ cursor: S4 } = w(),
		w4 = JF(),
		{ clear: pE, style: aE, figures: lD } = e();
	class iE extends w4 {
		constructor(D = {}) {
			D.overrideRender = !0;
			super(D);
			((this.inputValue = ''),
				(this.clear = pE('', this.out.columns)),
				(this.filteredOptions = this.value),
				this.render());
		}
		last() {
			((this.cursor = this.filteredOptions.length - 1), this.render());
		}
		next() {
			((this.cursor = (this.cursor + 1) % this.filteredOptions.length), this.render());
		}
		up() {
			if (this.cursor === 0) this.cursor = this.filteredOptions.length - 1;
			else this.cursor--;
			this.render();
		}
		down() {
			if (this.cursor === this.filteredOptions.length - 1) this.cursor = 0;
			else this.cursor++;
			this.render();
		}
		left() {
			((this.filteredOptions[this.cursor].selected = !1), this.render());
		}
		right() {
			if (this.value.filter((D) => D.selected).length >= this.maxChoices) return this.bell();
			((this.filteredOptions[this.cursor].selected = !0), this.render());
		}
		delete() {
			if (this.inputValue.length)
				((this.inputValue = this.inputValue.substr(0, this.inputValue.length - 1)),
					this.updateFilteredOptions());
		}
		updateFilteredOptions() {
			let D = this.filteredOptions[this.cursor];
			this.filteredOptions = this.value.filter((F) => {
				if (this.inputValue) {
					if (typeof F.title === 'string') {
						if (F.title.toLowerCase().includes(this.inputValue.toLowerCase())) return !0;
					}
					if (typeof F.value === 'string') {
						if (F.value.toLowerCase().includes(this.inputValue.toLowerCase())) return !0;
					}
					return !1;
				}
				return !0;
			});
			let u = this.filteredOptions.findIndex((F) => F === D);
			((this.cursor = u < 0 ? 0 : u), this.render());
		}
		handleSpaceToggle() {
			let D = this.filteredOptions[this.cursor];
			if (D.selected) ((D.selected = !1), this.render());
			else if (D.disabled || this.value.filter((u) => u.selected).length >= this.maxChoices)
				return this.bell();
			else ((D.selected = !0), this.render());
		}
		handleInputChange(D) {
			((this.inputValue = this.inputValue + D), this.updateFilteredOptions());
		}
		_(D, u) {
			if (D === ' ') this.handleSpaceToggle();
			else this.handleInputChange(D);
		}
		renderInstructions() {
			if (this.instructions === void 0 || this.instructions) {
				if (typeof this.instructions === 'string') return this.instructions;
				return `
Instructions:
    ${lD.arrowUp}/${lD.arrowDown}: Highlight option
    ${lD.arrowLeft}/${lD.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
`;
			}
			return '';
		}
		renderCurrentInput() {
			return `
Filtered results for: ${this.inputValue ? this.inputValue : LD.gray('Enter something to filter')}
`;
		}
		renderOption(D, u, F) {
			let E;
			if (u.disabled) E = D === F ? LD.gray().underline(u.title) : LD.strikethrough().gray(u.title);
			else E = D === F ? LD.cyan().underline(u.title) : u.title;
			return (u.selected ? LD.green(lD.radioOn) : lD.radioOff) + '  ' + E;
		}
		renderDoneOrInstructions() {
			if (this.done)
				return this.value
					.filter((u) => u.selected)
					.map((u) => u.title)
					.join(', ');
			let D = [LD.gray(this.hint), this.renderInstructions(), this.renderCurrentInput()];
			if (this.filteredOptions.length && this.filteredOptions[this.cursor].disabled)
				D.push(LD.yellow(this.warn));
			return D.join(' ');
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(S4.hide);
			super.render();
			let D = [
				aE.symbol(this.done, this.aborted),
				LD.bold(this.msg),
				aE.delimiter(!1),
				this.renderDoneOrInstructions()
			].join(' ');
			if (this.showMinError)
				((D += LD.red(`You must select a minimum of ${this.minSelected} choices.`)),
					(this.showMinError = !1));
			((D += this.renderOptions(this.filteredOptions)),
				this.out.write(this.clear + D),
				(this.clear = pE(D, this.out.columns)));
		}
	}
	nE.exports = iE;
});
var u1 = G((xZ, D1) => {
	var rE = S(),
		b4 = RD(),
		{ style: tE, clear: k4 } = e(),
		{ erase: x4, cursor: oE } = w();
	class eE extends b4 {
		constructor(D = {}) {
			super(D);
			((this.msg = D.message),
				(this.value = D.initial),
				(this.initialValue = !!D.initial),
				(this.yesMsg = D.yes || 'yes'),
				(this.yesOption = D.yesOption || '(Y/n)'),
				(this.noMsg = D.no || 'no'),
				(this.noOption = D.noOption || '(y/N)'),
				this.render());
		}
		reset() {
			((this.value = this.initialValue), this.fire(), this.render());
		}
		exit() {
			this.abort();
		}
		abort() {
			((this.done = this.aborted = !0),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		submit() {
			((this.value = this.value || !1),
				(this.done = !0),
				(this.aborted = !1),
				this.fire(),
				this.render(),
				this.out.write(`
`),
				this.close());
		}
		_(D, u) {
			if (D.toLowerCase() === 'y') return ((this.value = !0), this.submit());
			if (D.toLowerCase() === 'n') return ((this.value = !1), this.submit());
			return this.bell();
		}
		render() {
			if (this.closed) return;
			if (this.firstRender) this.out.write(oE.hide);
			else this.out.write(k4(this.outputText, this.out.columns));
			(super.render(),
				(this.outputText = [
					tE.symbol(this.done, this.aborted),
					rE.bold(this.msg),
					tE.delimiter(this.done),
					this.done
						? this.value
							? this.yesMsg
							: this.noMsg
						: rE.gray(this.initialValue ? this.yesOption : this.noOption)
				].join(' ')),
				this.out.write(x4.line + oE.to(0) + this.outputText));
		}
	}
	D1.exports = eE;
});
var E1 = G((vZ, F1) => {
	F1.exports = {
		TextPrompt: h6(),
		SelectPrompt: c6(),
		TogglePrompt: n6(),
		DatePrompt: OE(),
		NumberPrompt: kE(),
		MultiselectPrompt: JF(),
		AutocompletePrompt: lE(),
		AutocompleteMultiselectPrompt: sE(),
		ConfirmPrompt: u1()
	};
});
var C1 = G((B1) => {
	var l = B1,
		v4 = E1(),
		r0 = (D) => D;
	function HD(D, u, F = {}) {
		return new Promise((E, B) => {
			let C = new v4[D](u),
				A = F.onAbort || r0,
				_ = F.onSubmit || r0,
				$ = F.onExit || r0;
			(C.on('state', u.onState || r0),
				C.on('submit', (Z) => E(_(Z))),
				C.on('exit', (Z) => E($(Z))),
				C.on('abort', (Z) => B(A(Z))));
		});
	}
	l.text = (D) => HD('TextPrompt', D);
	l.password = (D) => {
		return ((D.style = 'password'), l.text(D));
	};
	l.invisible = (D) => {
		return ((D.style = 'invisible'), l.text(D));
	};
	l.number = (D) => HD('NumberPrompt', D);
	l.date = (D) => HD('DatePrompt', D);
	l.confirm = (D) => HD('ConfirmPrompt', D);
	l.list = (D) => {
		let u = D.separator || ',';
		return HD('TextPrompt', D, { onSubmit: (F) => F.split(u).map((E) => E.trim()) });
	};
	l.toggle = (D) => HD('TogglePrompt', D);
	l.select = (D) => HD('SelectPrompt', D);
	l.multiselect = (D) => {
		D.choices = [].concat(D.choices || []);
		let u = (F) => F.filter((E) => E.selected).map((E) => E.value);
		return HD('MultiselectPrompt', D, { onAbort: u, onSubmit: u });
	};
	l.autocompleteMultiselect = (D) => {
		D.choices = [].concat(D.choices || []);
		let u = (F) => F.filter((E) => E.selected).map((E) => E.value);
		return HD('AutocompleteMultiselectPrompt', D, { onAbort: u, onSubmit: u });
	};
	var y4 = (D, u) =>
		Promise.resolve(u.filter((F) => F.title.slice(0, D.length).toLowerCase() === D.toLowerCase()));
	l.autocomplete = (D) => {
		return (
			(D.suggest = D.suggest || y4),
			(D.choices = [].concat(D.choices || [])),
			HD('AutocompletePrompt', D)
		);
	};
});
var $1 = G((hZ, _1) => {
	var KF = C1(),
		h4 = ['suggest', 'format', 'onState', 'validate', 'onRender', 'type'],
		A1 = () => {};
	async function OD(D = [], { onSubmit: u = A1, onCancel: F = A1 } = {}) {
		let E = {},
			B = OD._override || {};
		D = [].concat(D);
		let C,
			A,
			_,
			$,
			Z,
			z,
			J = async (Q, Y, H = !1) => {
				if (!H && Q.validate && Q.validate(Y) !== !0) return;
				return Q.format ? await Q.format(Y, E) : Y;
			};
		for (A of D) {
			if ((({ name: $, type: Z } = A), typeof Z === 'function'))
				((Z = await Z(C, { ...E }, A)), (A.type = Z));
			if (!Z) continue;
			for (let Q in A) {
				if (h4.includes(Q)) continue;
				let Y = A[Q];
				A[Q] = typeof Y === 'function' ? await Y(C, { ...E }, z) : Y;
			}
			if (((z = A), typeof A.message !== 'string')) throw Error('prompt message is required');
			if ((({ name: $, type: Z } = A), KF[Z] === void 0))
				throw Error(`prompt type (${Z}) is not defined`);
			if (B[A.name] !== void 0) {
				if (((C = await J(A, B[A.name])), C !== void 0)) {
					E[$] = C;
					continue;
				}
			}
			try {
				((C = OD._injected ? f4(OD._injected, A.initial) : await KF[Z](A)),
					(E[$] = C = await J(A, C, !0)),
					(_ = await u(A, C, E)));
			} catch (Q) {
				_ = !(await F(A, E));
			}
			if (_) return E;
		}
		return E;
	}
	function f4(D, u) {
		let F = D.shift();
		if (F instanceof Error) throw F;
		return F === void 0 ? u : F;
	}
	function g4(D) {
		OD._injected = (OD._injected || []).concat(D);
	}
	function m4(D) {
		OD._override = Object.assign({}, D);
	}
	_1.exports = Object.assign(OD, { prompt: OD, prompts: KF, inject: g4, override: m4 });
});
var X1 = G((fZ, Z1) => {
	function d4(D) {
		D = (Array.isArray(D) ? D : D.split('.')).map(Number);
		let u = 0,
			F = process.versions.node.split('.').map(Number);
		for (; u < D.length; u++) {
			if (F[u] > D[u]) return !1;
			if (D[u] > F[u]) return !0;
		}
		return !1;
	}
	Z1.exports = d4('8.6.0') ? G6() : $1();
});
var xF = aD(kF(), 1),
	{
		program: c5,
		createCommand: l5,
		createArgument: p5,
		createOption: a5,
		CommanderError: i5,
		InvalidArgumentError: n5,
		InvalidOptionArgumentError: s5,
		Command: d,
		Argument: r5,
		Option: t5,
		Help: o5
	} = xF.default;
import { readFileSync as L5 } from 'fs';
import { join as V5, dirname as N5 } from 'path';
import { fileURLToPath as T5 } from 'url';
var vF =
		(D = 0) =>
		(u) =>
			`\x1B[${u + D}m`,
	yF =
		(D = 0) =>
		(u) =>
			`\x1B[${38 + D};5;${u}m`,
	hF =
		(D = 0) =>
		(u, F, E) =>
			`\x1B[${38 + D};2;${u};${F};${E}m`,
	O = {
		modifier: {
			reset: [0, 0],
			bold: [1, 22],
			dim: [2, 22],
			italic: [3, 23],
			underline: [4, 24],
			overline: [53, 55],
			inverse: [7, 27],
			hidden: [8, 28],
			strikethrough: [9, 29]
		},
		color: {
			black: [30, 39],
			red: [31, 39],
			green: [32, 39],
			yellow: [33, 39],
			blue: [34, 39],
			magenta: [35, 39],
			cyan: [36, 39],
			white: [37, 39],
			blackBright: [90, 39],
			gray: [90, 39],
			grey: [90, 39],
			redBright: [91, 39],
			greenBright: [92, 39],
			yellowBright: [93, 39],
			blueBright: [94, 39],
			magentaBright: [95, 39],
			cyanBright: [96, 39],
			whiteBright: [97, 39]
		},
		bgColor: {
			bgBlack: [40, 49],
			bgRed: [41, 49],
			bgGreen: [42, 49],
			bgYellow: [43, 49],
			bgBlue: [44, 49],
			bgMagenta: [45, 49],
			bgCyan: [46, 49],
			bgWhite: [47, 49],
			bgBlackBright: [100, 49],
			bgGray: [100, 49],
			bgGrey: [100, 49],
			bgRedBright: [101, 49],
			bgGreenBright: [102, 49],
			bgYellowBright: [103, 49],
			bgBlueBright: [104, 49],
			bgMagentaBright: [105, 49],
			bgCyanBright: [106, 49],
			bgWhiteBright: [107, 49]
		}
	},
	DA = Object.keys(O.modifier),
	QB = Object.keys(O.color),
	GB = Object.keys(O.bgColor),
	uA = [...QB, ...GB];
function KB() {
	let D = new Map();
	for (let [u, F] of Object.entries(O)) {
		for (let [E, B] of Object.entries(F))
			((O[E] = { open: `\x1B[${B[0]}m`, close: `\x1B[${B[1]}m` }),
				(F[E] = O[E]),
				D.set(B[0], B[1]));
		Object.defineProperty(O, u, { value: F, enumerable: !1 });
	}
	return (
		Object.defineProperty(O, 'codes', { value: D, enumerable: !1 }),
		(O.color.close = '\x1B[39m'),
		(O.bgColor.close = '\x1B[49m'),
		(O.color.ansi = vF()),
		(O.color.ansi256 = yF()),
		(O.color.ansi16m = hF()),
		(O.bgColor.ansi = vF(10)),
		(O.bgColor.ansi256 = yF(10)),
		(O.bgColor.ansi16m = hF(10)),
		Object.defineProperties(O, {
			rgbToAnsi256: {
				value(u, F, E) {
					if (u === F && F === E) {
						if (u < 8) return 16;
						if (u > 248) return 231;
						return Math.round(((u - 8) / 247) * 24) + 232;
					}
					return (
						16 +
						36 * Math.round((u / 255) * 5) +
						6 * Math.round((F / 255) * 5) +
						Math.round((E / 255) * 5)
					);
				},
				enumerable: !1
			},
			hexToRgb: {
				value(u) {
					let F = /[a-f\d]{6}|[a-f\d]{3}/i.exec(u.toString(16));
					if (!F) return [0, 0, 0];
					let [E] = F;
					if (E.length === 3) E = [...E].map((C) => C + C).join('');
					let B = Number.parseInt(E, 16);
					return [(B >> 16) & 255, (B >> 8) & 255, B & 255];
				},
				enumerable: !1
			},
			hexToAnsi256: { value: (u) => O.rgbToAnsi256(...O.hexToRgb(u)), enumerable: !1 },
			ansi256ToAnsi: {
				value(u) {
					if (u < 8) return 30 + u;
					if (u < 16) return 90 + (u - 8);
					let F, E, B;
					if (u >= 232) ((F = ((u - 232) * 10 + 8) / 255), (E = F), (B = F));
					else {
						u -= 16;
						let _ = u % 36;
						((F = Math.floor(u / 36) / 5), (E = Math.floor(_ / 6) / 5), (B = (_ % 6) / 5));
					}
					let C = Math.max(F, E, B) * 2;
					if (C === 0) return 30;
					let A = 30 + ((Math.round(B) << 2) | (Math.round(E) << 1) | Math.round(F));
					if (C === 2) A += 60;
					return A;
				},
				enumerable: !1
			},
			rgbToAnsi: { value: (u, F, E) => O.ansi256ToAnsi(O.rgbToAnsi256(u, F, E)), enumerable: !1 },
			hexToAnsi: { value: (u) => O.ansi256ToAnsi(O.hexToAnsi256(u)), enumerable: !1 }
		}),
		O
	);
}
var UB = KB(),
	s = UB;
import Au from 'process';
import MB from 'os';
import fF from 'tty';
function n(D, u = globalThis.Deno ? globalThis.Deno.args : Au.argv) {
	let F = D.startsWith('-') ? '' : D.length === 1 ? '-' : '--',
		E = u.indexOf(F + D),
		B = u.indexOf('--');
	return E !== -1 && (B === -1 || E < B);
}
var { env: P } = Au,
	K0;
if (n('no-color') || n('no-colors') || n('color=false') || n('color=never')) K0 = 0;
else if (n('color') || n('colors') || n('color=true') || n('color=always')) K0 = 1;
function WB() {
	if ('FORCE_COLOR' in P) {
		if (P.FORCE_COLOR === 'true') return 1;
		if (P.FORCE_COLOR === 'false') return 0;
		return P.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(P.FORCE_COLOR, 10), 3);
	}
}
function RB(D) {
	if (D === 0) return !1;
	return { level: D, hasBasic: !0, has256: D >= 2, has16m: D >= 3 };
}
function qB(D, { streamIsTTY: u, sniffFlags: F = !0 } = {}) {
	let E = WB();
	if (E !== void 0) K0 = E;
	let B = F ? K0 : E;
	if (B === 0) return 0;
	if (F) {
		if (n('color=16m') || n('color=full') || n('color=truecolor')) return 3;
		if (n('color=256')) return 2;
	}
	if ('TF_BUILD' in P && 'AGENT_NAME' in P) return 1;
	if (D && !u && B === void 0) return 0;
	let C = B || 0;
	if (P.TERM === 'dumb') return C;
	if (Au.platform === 'win32') {
		let A = MB.release().split('.');
		if (Number(A[0]) >= 10 && Number(A[2]) >= 10586) return Number(A[2]) >= 14931 ? 3 : 2;
		return 1;
	}
	if ('CI' in P) {
		if (['GITHUB_ACTIONS', 'GITEA_ACTIONS', 'CIRCLECI'].some((A) => A in P)) return 3;
		if (
			['TRAVIS', 'APPVEYOR', 'GITLAB_CI', 'BUILDKITE', 'DRONE'].some((A) => A in P) ||
			P.CI_NAME === 'codeship'
		)
			return 1;
		return C;
	}
	if ('TEAMCITY_VERSION' in P)
		return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(P.TEAMCITY_VERSION) ? 1 : 0;
	if (P.COLORTERM === 'truecolor') return 3;
	if (P.TERM === 'xterm-kitty') return 3;
	if (P.TERM === 'xterm-ghostty') return 3;
	if (P.TERM === 'wezterm') return 3;
	if ('TERM_PROGRAM' in P) {
		let A = Number.parseInt((P.TERM_PROGRAM_VERSION || '').split('.')[0], 10);
		switch (P.TERM_PROGRAM) {
			case 'iTerm.app':
				return A >= 3 ? 3 : 2;
			case 'Apple_Terminal':
				return 2;
		}
	}
	if (/-256(color)?$/i.test(P.TERM)) return 2;
	if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(P.TERM)) return 1;
	if ('COLORTERM' in P) return 1;
	return C;
}
function gF(D, u = {}) {
	let F = qB(D, { streamIsTTY: D && D.isTTY, ...u });
	return RB(F);
}
var LB = { stdout: gF({ isTTY: fF.isatty(1) }), stderr: gF({ isTTY: fF.isatty(2) }) },
	mF = LB;
function dF(D, u, F) {
	let E = D.indexOf(u);
	if (E === -1) return D;
	let B = u.length,
		C = 0,
		A = '';
	do ((A += D.slice(C, E) + u + F), (C = E + B), (E = D.indexOf(u, C)));
	while (E !== -1);
	return ((A += D.slice(C)), A);
}
function cF(D, u, F, E) {
	let B = 0,
		C = '';
	do {
		let A = D[E - 1] === '\r';
		((C +=
			D.slice(B, A ? E - 1 : E) +
			u +
			(A
				? `\r
`
				: `
`) +
			F),
			(B = E + 1),
			(E = D.indexOf(
				`
`,
				B
			)));
	} while (E !== -1);
	return ((C += D.slice(B)), C);
}
var { stdout: lF, stderr: pF } = mF,
	_u = Symbol('GENERATOR'),
	xD = Symbol('STYLER'),
	nD = Symbol('IS_EMPTY'),
	aF = ['ansi', 'ansi', 'ansi256', 'ansi16m'],
	vD = Object.create(null),
	VB = (D, u = {}) => {
		if (u.level && !(Number.isInteger(u.level) && u.level >= 0 && u.level <= 3))
			throw Error('The `level` option should be an integer from 0 to 3');
		let F = lF ? lF.level : 0;
		D.level = u.level === void 0 ? F : u.level;
	};
var NB = (D) => {
	let u = (...F) => F.join(' ');
	return (VB(u, D), Object.setPrototypeOf(u, sD.prototype), u);
};
function sD(D) {
	return NB(D);
}
Object.setPrototypeOf(sD.prototype, Function.prototype);
for (let [D, u] of Object.entries(s))
	vD[D] = {
		get() {
			let F = U0(this, Zu(u.open, u.close, this[xD]), this[nD]);
			return (Object.defineProperty(this, D, { value: F }), F);
		}
	};
vD.visible = {
	get() {
		let D = U0(this, this[xD], !0);
		return (Object.defineProperty(this, 'visible', { value: D }), D);
	}
};
var $u = (D, u, F, ...E) => {
		if (D === 'rgb') {
			if (u === 'ansi16m') return s[F].ansi16m(...E);
			if (u === 'ansi256') return s[F].ansi256(s.rgbToAnsi256(...E));
			return s[F].ansi(s.rgbToAnsi(...E));
		}
		if (D === 'hex') return $u('rgb', u, F, ...s.hexToRgb(...E));
		return s[F][D](...E);
	},
	TB = ['rgb', 'hex', 'ansi256'];
for (let D of TB) {
	vD[D] = {
		get() {
			let { level: F } = this;
			return function (...E) {
				let B = Zu($u(D, aF[F], 'color', ...E), s.color.close, this[xD]);
				return U0(this, B, this[nD]);
			};
		}
	};
	let u = 'bg' + D[0].toUpperCase() + D.slice(1);
	vD[u] = {
		get() {
			let { level: F } = this;
			return function (...E) {
				let B = Zu($u(D, aF[F], 'bgColor', ...E), s.bgColor.close, this[xD]);
				return U0(this, B, this[nD]);
			};
		}
	};
}
var IB = Object.defineProperties(() => {}, {
		...vD,
		level: {
			enumerable: !0,
			get() {
				return this[_u].level;
			},
			set(D) {
				this[_u].level = D;
			}
		}
	}),
	Zu = (D, u, F) => {
		let E, B;
		if (F === void 0) ((E = D), (B = u));
		else ((E = F.openAll + D), (B = u + F.closeAll));
		return { open: D, close: u, openAll: E, closeAll: B, parent: F };
	},
	U0 = (D, u, F) => {
		let E = (...B) => jB(E, B.length === 1 ? '' + B[0] : B.join(' '));
		return (Object.setPrototypeOf(E, IB), (E[_u] = D), (E[xD] = u), (E[nD] = F), E);
	},
	jB = (D, u) => {
		if (D.level <= 0 || !u) return D[nD] ? '' : u;
		let F = D[xD];
		if (F === void 0) return u;
		let { openAll: E, closeAll: B } = F;
		if (u.includes('\x1B')) while (F !== void 0) ((u = dF(u, F.close, F.open)), (F = F.parent));
		let C = u.indexOf(`
`);
		if (C !== -1) u = cF(u, B, E, C);
		return E + u + B;
	};
Object.defineProperties(sD.prototype, vD);
var OB = sD(),
	YA = sD({ level: pF ? pF.level : 0 });
var X = OB;
import { existsSync as PB, mkdirSync as GA, readFileSync as SB, writeFileSync as KA } from 'fs';
import { homedir as wB } from 'os';
import { join as bB } from 'path';
var iF = {
		apiUrl: 'http://localhost:9000',
		output: { format: 'table', colors: !0, verbose: !1 },
		tokenEfficiency: { defaultLimit: 100, warnThreshold: 50000 },
		timeout: 30000,
		debug: !1
	},
	y = {
		API_URL: 'DATABASIN_API_URL',
		TOKEN: 'DATABASIN_TOKEN',
		DEFAULT_PROJECT: 'DATABASIN_DEFAULT_PROJECT',
		DEBUG: 'DATABASIN_DEBUG',
		CONFIG_PATH: 'DATABASIN_CONFIG_PATH',
		TIMEOUT: 'DATABASIN_TIMEOUT',
		OUTPUT_FORMAT: 'DATABASIN_OUTPUT_FORMAT',
		NO_COLOR: 'NO_COLOR'
	};
class r extends Error {
	exitCode;
	suggestion;
	constructor(D, u = 1, F) {
		super(D);
		this.exitCode = u;
		this.suggestion = F;
		((this.name = 'CliError'), Error.captureStackTrace(this, this.constructor));
	}
	toString() {
		let D = `Error: ${this.message}`;
		if (this.suggestion)
			D += `

Suggestion: ${this.suggestion}`;
		return D;
	}
}
class v extends r {
	statusCode;
	endpoint;
	responseBody;
	constructor(D, u, F, E) {
		super(D, 1);
		this.statusCode = u;
		this.endpoint = F;
		this.responseBody = E;
		((this.name = 'ApiError'), (this.suggestion = v.getSuggestion(u)));
	}
	static getSuggestion(D) {
		switch (D) {
			case 400:
				return 'Check your request parameters and payload syntax. Verify required fields are present.';
			case 401:
				return 'Your authentication token may be invalid or expired. Run: databasin auth verify';
			case 403:
				return 'You do not have permission to access this resource. Check your project access rights.';
			case 404:
				return 'The requested resource was not found. Verify the ID and try again.';
			case 429:
				return 'Rate limit exceeded. Please wait a moment before retrying.';
			case 500:
			case 502:
			case 503:
			case 504:
				return 'The DataBasin API is experiencing issues. Please try again later.';
			default:
				return 'Check the error message above for details.';
		}
	}
	toString() {
		let D = `API Error (${this.statusCode}): ${this.message}
Endpoint: ${this.endpoint}`;
		if (this.suggestion)
			D += `

Suggestion: ${this.suggestion}`;
		return D;
	}
}
class Xu extends r {
	constructor(D, u) {
		super(D, 1, u || 'Run: databasin auth login');
		this.name = 'AuthError';
	}
}
class FD extends r {
	field;
	errors;
	constructor(D, u, F) {
		super(D, 1);
		this.field = u;
		this.errors = F;
		if (((this.name = 'ValidationError'), F && F.length > 0))
			this.suggestion =
				`Fix the following validation errors:
  - ` +
				F.join(`
  - `);
	}
	toString() {
		let D = `Validation Error: ${this.message}`;
		if (this.field) D += ` (field: ${this.field})`;
		if (this.suggestion)
			D += `

${this.suggestion}`;
		return D;
	}
}
class V extends r {
	configPath;
	constructor(D, u) {
		super(D, 1, 'Check your configuration file or environment variables');
		this.configPath = u;
		this.name = 'ConfigError';
	}
	toString() {
		let D = `Configuration Error: ${this.message}`;
		if (this.configPath)
			D += `
Config file: ${this.configPath}`;
		return (
			(D += `

Suggestion: ${this.suggestion}`),
			D
		);
	}
}
class yD extends r {
	path;
	operation;
	constructor(D, u, F) {
		super(D, 1);
		this.path = u;
		this.operation = F;
		((this.name = 'FileSystemError'),
			(this.suggestion = `Check that the file exists and you have ${F} permissions: ${u}`));
	}
}
class VD extends r {
	url;
	constructor(D, u) {
		super(D, 1, 'Check your internet connection and verify the API URL is correct');
		this.url = u;
		this.name = 'NetworkError';
	}
}
function rD(D) {
	if (D instanceof r) return D.toString();
	if (D instanceof Error) return `Error: ${D.message}`;
	return `Unknown error: ${String(D)}`;
}
function nF(D) {
	if (D instanceof r) return D.exitCode;
	return 1;
}
function sF(D, u) {
	let F = D.statusText || `HTTP ${D.status}`;
	return new v(F, D.status, u);
}
function rF() {
	let D = process.env[y.CONFIG_PATH];
	if (D !== void 0 && D !== '') return D;
	return bB(wB(), '.databasin', 'config.json');
}
function kB() {
	let D = rF();
	if (!PB(D)) return {};
	try {
		let u = SB(D, 'utf-8');
		if (!u.trim()) return {};
		let F = JSON.parse(u);
		if (!F || typeof F !== 'object' || Array.isArray(F))
			throw new V('Config file must contain a JSON object', D);
		return F;
	} catch (u) {
		if (u instanceof V) throw u;
		throw new V(`Failed to parse config file: ${u instanceof Error ? u.message : String(u)}`, D);
	}
}
function xB() {
	let D = {};
	if (process.env[y.API_URL]) D.apiUrl = process.env[y.API_URL];
	if (process.env[y.DEFAULT_PROJECT]) D.defaultProject = process.env[y.DEFAULT_PROJECT];
	if (process.env[y.DEBUG]) D.debug = process.env[y.DEBUG] === 'true';
	if (process.env[y.TIMEOUT]) {
		let u = process.env[y.TIMEOUT];
		if (u) {
			let F = parseInt(u, 10);
			if (!isNaN(F) && F > 0) D.timeout = F * 1000;
		}
	}
	if (process.env[y.OUTPUT_FORMAT]) {
		let u = process.env[y.OUTPUT_FORMAT];
		if (u === 'table' || u === 'json' || u === 'csv') D.output = { format: u };
	}
	if (process.env[y.NO_COLOR]) D.output = { ...D.output, colors: !1 };
	return D;
}
function vB(...D) {
	let u = { ...iF };
	for (let F of D) {
		if (F.apiUrl !== void 0) u.apiUrl = F.apiUrl;
		if (F.defaultProject !== void 0) u.defaultProject = F.defaultProject;
		if (F.timeout !== void 0) u.timeout = F.timeout;
		if (F.debug !== void 0) u.debug = F.debug;
		if (F.output) u.output = { ...u.output, ...F.output };
		if (F.tokenEfficiency) u.tokenEfficiency = { ...u.tokenEfficiency, ...F.tokenEfficiency };
	}
	return u;
}
function Yu(D) {
	if (D.apiUrl !== void 0) {
		if (typeof D.apiUrl !== 'string') throw new V('API URL must be a string');
		try {
			if (!new URL(D.apiUrl).protocol.startsWith('http'))
				throw new V('API URL must use HTTP or HTTPS protocol');
		} catch (u) {
			if (u instanceof V) throw u;
			throw new V('Invalid API URL: must be a valid HTTP(S) URL');
		}
	}
	if (D.timeout !== void 0) {
		if (typeof D.timeout !== 'number') throw new V('Timeout must be a number');
		if (D.timeout < 0) throw new V('Timeout must be a positive number (milliseconds)');
		if (D.timeout === 0) throw new V('Timeout must be greater than 0');
	}
	if (D.output) {
		if (typeof D.output !== 'object') throw new V('Output settings must be an object');
		if (D.output.format !== void 0) {
			let u = ['table', 'json', 'csv'];
			if (!u.includes(D.output.format))
				throw new V(`Invalid output format: must be one of ${u.join(', ')}`);
		}
		if (D.output.colors !== void 0 && typeof D.output.colors !== 'boolean')
			throw new V('Output colors setting must be a boolean');
		if (D.output.verbose !== void 0 && typeof D.output.verbose !== 'boolean')
			throw new V('Output verbose setting must be a boolean');
	}
	if (D.tokenEfficiency) {
		if (typeof D.tokenEfficiency !== 'object')
			throw new V('Token efficiency settings must be an object');
		if (D.tokenEfficiency.defaultLimit !== void 0) {
			if (typeof D.tokenEfficiency.defaultLimit !== 'number')
				throw new V('Token efficiency defaultLimit must be a number');
			if (D.tokenEfficiency.defaultLimit < 1)
				throw new V('Token efficiency defaultLimit must be at least 1');
		}
		if (D.tokenEfficiency.warnThreshold !== void 0) {
			if (typeof D.tokenEfficiency.warnThreshold !== 'number')
				throw new V('Token efficiency warnThreshold must be a number');
			if (D.tokenEfficiency.warnThreshold < 0)
				throw new V('Token efficiency warnThreshold must be a positive number');
		}
	}
	if (D.debug !== void 0 && typeof D.debug !== 'boolean')
		throw new V('Debug setting must be a boolean');
	if (D.defaultProject !== void 0) {
		if (typeof D.defaultProject !== 'string') throw new V('Default project must be a string');
		if (D.defaultProject.trim() === '') throw new V('Default project cannot be empty');
	}
}
function M0(D = {}) {
	let u = kB(),
		F = xB();
	try {
		Yu(u);
	} catch (B) {
		if (B instanceof V) throw new V(`Invalid config file: ${B.message}`, rF());
		throw B;
	}
	try {
		Yu(F);
	} catch (B) {
		if (B instanceof V) throw new V(`Invalid environment variable: ${B.message}`);
		throw B;
	}
	try {
		Yu(D);
	} catch (B) {
		if (B instanceof V) throw new V(`Invalid CLI option: ${B.message}`);
		throw B;
	}
	return vB(u, F, D);
}
import {
	existsSync as yB,
	readFileSync as hB,
	writeFileSync as NA,
	chmodSync as TA,
	unlinkSync as IA
} from 'fs';
import { join as W0 } from 'path';
import { cwd as tF } from 'process';
import { homedir as oF } from 'os';
function fB() {
	return [W0(tF(), '.token'), W0(oF(), '.databasin', '.token')];
}
function gB() {
	return W0(oF(), '.databasin', '.token');
}
function mB() {
	let D = process.env[y.TOKEN];
	return D ? D.trim() : null;
}
function dB() {
	let D = fB();
	for (let u of D)
		if (yB(u))
			try {
				let F = hB(u, 'utf-8').trim();
				if (F) return F;
			} catch (F) {
				throw new yD(
					`Failed to read token file: ${F instanceof Error ? F.message : String(F)}`,
					u,
					'read'
				);
			}
	return null;
}
function eF() {
	let D = mB();
	if (D) return D;
	let u = dB();
	if (u) return u;
	throw new Xu(
		'No authentication token found',
		`Token must be provided via:
  1. Environment variable: ${y.TOKEN}
  2. Project token file: ${W0(tF(), '.token')}
  3. User token file: ${gB()}

Run 'databasin auth login' to authenticate.`
	);
}
class a {
	baseUrl;
	token = null;
	config;
	constructor(D) {
		((this.config = D || M0()), (this.baseUrl = this.config.apiUrl));
	}
	getToken() {
		if (!this.token) this.token = eF();
		return this.token;
	}
	refreshToken() {
		this.token = null;
	}
	buildUrl(D, u) {
		let F = new URL(D, this.baseUrl);
		if (u)
			Object.entries(u).forEach(([E, B]) => {
				F.searchParams.append(E, String(B));
			});
		return F.toString();
	}
	buildHeaders(D = {}) {
		let u = new Headers({
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...(D.headers || {})
		});
		if (!D.skipAuth) {
			let F = this.getToken();
			u.set('Authorization', `Bearer ${F}`);
		}
		return u;
	}
	logRequest(D, u, F) {
		if ((console.error(`[API] ${D} ${u}`), F))
			console.error('[API] Body:', JSON.stringify(F, null, 2));
	}
	logResponse(D, u, F) {
		console.error(`[API] ${D} ${u} (${F}ms)`);
	}
	async request(D, u, F, E = {}) {
		let B = this.buildUrl(u, E.params),
			C = this.buildHeaders(E),
			A = E.timeout || this.config.timeout,
			_ = E.retries ?? 0,
			$ = E.retryDelay ?? 1000,
			Z = Date.now(),
			z = E.debug ?? this.config.debug;
		if (z) this.logRequest(D, u, F);
		let J = null;
		for (let Q = 0; Q <= _; Q++)
			try {
				let Y = new AbortController(),
					H = setTimeout(() => Y.abort(), A),
					K = await fetch(B, {
						method: D,
						headers: C,
						body: F ? JSON.stringify(F) : void 0,
						signal: Y.signal
					});
				clearTimeout(H);
				let M = Date.now() - Z;
				if (z) this.logResponse(K.status, K.statusText, M);
				if (!K.ok) {
					if (K.status === 401 && !E.skipAuth && !E._isRetry)
						return (this.refreshToken(), this.request(D, u, F, { ...E, _isRetry: !0 }));
					throw sF(K, u);
				}
				return await K.json();
			} catch (Y) {
				if (Y instanceof Error && Y.name === 'AbortError')
					throw new VD(`Request timeout after ${A}ms`, B);
				if (Y instanceof v) throw Y;
				if (Y instanceof Error) {
					if (
						Y.message.includes('fetch failed') ||
						Y.message.includes('ECONNREFUSED') ||
						Y.message.includes('ENOTFOUND')
					) {
						if (((J = Y), Q < _)) {
							if (z)
								console.error(`[API] Network error, retrying in ${$}ms (attempt ${Q + 1}/${_})...`);
							await new Promise((K) => setTimeout(K, $));
							continue;
						}
						throw new VD(Y.message, B);
					}
				}
				throw Y;
			}
		throw new VD(J?.message || 'Network request failed after retries', B);
	}
	applyTokenEfficiency(D, u) {
		if (!D) return D;
		if (u.count) {
			if (Array.isArray(D)) return { count: D.length };
			return { count: 1 };
		}
		if (u.limit && Array.isArray(D)) return D.slice(0, u.limit);
		if (u.fields && Array.isArray(D)) {
			let F = u.fields.split(',').map((E) => E.trim());
			return D.map((E) => {
				let B = {};
				return (
					F.forEach((C) => {
						if (C in E) B[C] = E[C];
					}),
					B
				);
			});
		}
		if (u.fields && !Array.isArray(D) && typeof D === 'object') {
			let F = u.fields.split(',').map((B) => B.trim()),
				E = {};
			return (
				F.forEach((B) => {
					if (B in D) E[B] = D[B];
				}),
				E
			);
		}
		return D;
	}
	async get(D, u) {
		let F = await this.request('GET', D, void 0, u);
		return this.applyTokenEfficiency(F, u || {});
	}
	async post(D, u, F) {
		return this.request('POST', D, u, F);
	}
	async put(D, u, F) {
		return this.request('PUT', D, u, F);
	}
	async delete(D, u) {
		return this.request('DELETE', D, void 0, u);
	}
	async ping() {
		try {
			return (await this.get('/api/ping'), !0);
		} catch {
			return !1;
		}
	}
	setBaseUrl(D) {
		this.baseUrl = D;
	}
	getBaseUrl() {
		return this.baseUrl;
	}
	clearToken() {
		this.token = null;
	}
}
function zu(D) {
	return new a(D);
}
class Hu extends a {
	async list(D) {
		return await this.get('/api/my/projects', D);
	}
	async get(D, u) {
		return await super.get(`/api/project/${D}`, u);
	}
	async listOrganizations(D) {
		return await this.get('/api/my/organizations', D);
	}
	async getCurrentUser(D) {
		return await this.get('/api/my/account', D);
	}
	async getProjectUsers(D, u) {
		return await this.get(`/api/project/${D}/users`, u);
	}
	async getProjectStats(D, u) {
		return await this.get(`/api/project/${D}/stats`, u);
	}
}
function Ju() {
	return new Hu();
}
class Qu extends a {
	async list(D, u) {
		let F = { count: !0, ...u },
			E = D ? { internalID: D } : void 0;
		return await this.get('/api/connector', { ...F, params: E });
	}
	async get(D) {
		return await super.get(`/api/connector/${D}`);
	}
	async create(D) {
		return await this.post('/api/connector', D);
	}
	async update(D, u) {
		return await this.put(`/api/connector/${D}`, u);
	}
	async delete(D) {
		return await super.delete(`/api/connector/${D}`);
	}
	async getConfig(D) {
		return await super.get('/api/config', D);
	}
}
function Gu() {
	return new Qu();
}
class Ku extends a {
	async list(D, u) {
		if (!D || D.trim().length === 0)
			throw new FD('projectId is required for listing pipelines', 'projectId', [
				'The API endpoint /api/pipeline requires internalID parameter',
				'Provide a valid project internal ID (e.g., "N1r8Do")'
			]);
		let F = { internalID: D.trim() };
		if (u?.status) F.status = u.status;
		if (u?.enabled !== void 0) F.enabled = u.enabled;
		if (u?.sourceConnectorId) F.sourceConnectorId = u.sourceConnectorId;
		if (u?.targetConnectorId) F.targetConnectorId = u.targetConnectorId;
		if (u?.includeArtifacts !== void 0) F.includeArtifacts = u.includeArtifacts;
		let E = { ...u, params: F };
		return await this.get('/api/pipeline', E);
	}
	async get(D, u) {
		return await super.get(`/api/pipeline/${D}`, u);
	}
	async create(D, u) {
		if (!D.pipelineName || D.pipelineName.trim().length === 0)
			throw new FD('Pipeline name is required', 'pipelineName', [
				'Provide a non-empty pipelineName field'
			]);
		return await this.post('/api/pipeline', D, u);
	}
	async update(D, u, F) {
		return await this.put(`/api/pipeline/${D}`, u, F);
	}
	async delete(D, u) {
		await super.delete(`/api/pipeline/${D}`, u);
	}
	async run(D, u) {
		return await this.post(`/api/pipeline/${D}/run`, void 0, u);
	}
}
function Uu() {
	return new Ku();
}
class Mu extends a {
	async list(D, u) {
		if (!D) return null;
		let F = { internalID: D };
		if (u?.active !== void 0) F.active = u.active;
		if (u?.running !== void 0) F.running = u.running;
		if (u?.sortBy) F.sortBy = u.sortBy;
		if (u?.sortOrder) F.sortOrder = u.sortOrder;
		return super.get('/api/automations', { ...u, params: F });
	}
	async get(D, u) {
		return super.get(`/api/automations/${D}`, u);
	}
	async create(D, u) {
		return super.post('/api/automations', D, u);
	}
	async update(D, u, F) {
		return super.put(`/api/automations/${D}`, u, F);
	}
	async delete(D, u) {
		return super.delete(`/api/automations/${D}`, u);
	}
	async run(D, u) {
		return super.post(`/api/automations/${D}/run`, void 0, u);
	}
}
function Wu() {
	return new Mu();
}
class Ru extends a {
	async listCatalogs(D, u) {
		return (await this.get(`/api/v2/connector/catalogs/${D}`, u)).catalogs.map((E) => ({
			name: E
		}));
	}
	async listSchemas(D, u, F) {
		let E = u ? { catalog: u } : void 0,
			B = { ...F, params: { ...F?.params, ...E } };
		return (await this.get(`/api/v2/connector/schemas/${D}`, B)).schemas.map((A) => ({
			name: A,
			catalog: u
		}));
	}
	async listTables(D, u, F, E) {
		let B = {};
		if (u) B.catalog = u;
		if (F) B.schema = F;
		let C = { ...E, params: { ...E?.params, ...B } };
		return (await this.get(`/api/v2/connector/tables/${D}`, C)).tables.map((_) => ({
			name: _.name,
			type: _.type,
			catalog: u,
			schema: F
		}));
	}
	async getColumns(D, u, F, E, B) {
		let C = { connectorID: typeof D === 'string' ? parseInt(D) : D, tableName: u };
		if (E && F) C.schemaCatalog = `${E}.${F}`;
		else if (F) C.schemaCatalog = F;
		else if (E) C.schemaCatalog = E;
		return (await this.post('/api/connector/columns', C, B)).map((_) => ({
			..._,
			table: u,
			schema: F,
			catalog: E
		}));
	}
	async executeQuery(D, u, F) {
		let E = { sql: u },
			B = await this.post(`/api/connector/${D}/query`, E, F);
		if (!B.success && B.error) throw Error(B.error);
		return B;
	}
	async getSchemaContext(D, u) {
		return await this.get(`/api/connector/${D}/schema-context`, u);
	}
}
function qu() {
	return new Ru();
}
function D2(D) {
	return {
		base: zu(D),
		projects: Ju(),
		connectors: Gu(),
		pipelines: Uu(),
		automations: Wu(),
		sql: qu()
	};
}
var I2 = aD(N2(), 1);
function j2(D, u = '-') {
	if (D === null || D === void 0) return u;
	if (Array.isArray(D)) return JSON.stringify(D);
	if (D instanceof Date) return D.toISOString();
	if (typeof D === 'object') return JSON.stringify(D);
	return String(D);
}
function O2(D, u) {
	if (u && u.length > 0) return u;
	if (D.length === 0) return [];
	let F = D[0];
	return Object.keys(F);
}
function BD(D, u = {}) {
	if (!Array.isArray(D) || D.length === 0)
		return u.colors !== !1 ? X.yellow('No data to display') : 'No data to display';
	let F = u.colors !== !1 && !process.env.NO_COLOR,
		E = O2(D, u.fields),
		B = u.headers || E,
		C = void 0;
	if (u.style === 'compact')
		C = {
			top: '',
			'top-mid': '',
			'top-left': '',
			'top-right': '',
			bottom: '',
			'bottom-mid': '',
			'bottom-left': '',
			'bottom-right': '',
			left: '',
			'left-mid': '',
			mid: '',
			'mid-mid': '',
			right: '',
			'right-mid': '',
			middle: ' '
		};
	else if (u.style === 'markdown')
		C = {
			top: '',
			'top-mid': '',
			'top-left': '',
			'top-right': '',
			bottom: '',
			'bottom-mid': '',
			'bottom-left': '',
			'bottom-right': '',
			left: '|',
			'left-mid': '|',
			mid: '-',
			'mid-mid': '|',
			right: '|',
			'right-mid': '|',
			middle: '|'
		};
	let A = { head: F ? B.map(($) => X.cyan.bold($)) : B, chars: C };
	if (u.maxWidth !== void 0) ((A.wordWrap = !0), (A.colWidths = Array(E.length).fill(u.maxWidth)));
	let _ = new I2.default(A);
	for (let $ of D) {
		let Z = E.map((z) => j2($[z]));
		_.push(Z);
	}
	return _.toString();
}
function J7(D) {
	let u = X.level;
	if (X.level === 0) X.level = 1;
	let F = D.replace(/"([^"]+)":/g, (E, B) => `${X.cyan(`"${B}"`)}:`)
		.replace(/:\s*"([^"]*)"/g, (E, B) => `: ${X.green(`"${B}"`)}`)
		.replace(/:\s*(\d+\.?\d*)/g, (E, B) => `: ${X.yellow(B)}`)
		.replace(/:\s*(true|false)/g, (E, B) => `: ${X.magenta(B)}`)
		.replace(/:\s*null/g, `: ${X.gray('null')}`);
	return ((X.level = u), F);
}
function CD(D, u = {}) {
	let F = u.indent ?? 2,
		E = u.colors !== !1 && !process.env.NO_COLOR,
		B = u.syntaxHighlight !== !1 && E,
		C = JSON.stringify(D, null, F);
	if (B) return J7(C);
	return C;
}
function T2(D, u, F) {
	if (D === '') return D;
	if (
		D.includes(u) ||
		D.includes(F) ||
		D.includes(`
`) ||
		D.includes('\r')
	) {
		let B = D.replace(new RegExp(F, 'g'), F + F);
		return `${F}${B}${F}`;
	}
	return D;
}
function AD(D, u = {}) {
	if (!Array.isArray(D) || D.length === 0) return '';
	let F = u.delimiter || ',',
		E = u.quote || '"',
		B = O2(D, u.fields),
		C = [],
		A = B.map((_) => T2(_, F, E)).join(F);
	C.push(A);
	for (let _ of D) {
		let $ = B.map((Z) => {
			let z = j2(_[Z], '');
			return T2(z, F, E);
		}).join(F);
		C.push($);
	}
	return C.join(`
`);
}
function Q7(D, u) {
	if (!u.enabled) return '';
	let F = D.length;
	if (F > u.warnThreshold)
		return [
			X.yellow('\u26A0 Token Efficiency Warning:'),
			X.yellow(`Output size: ${F.toLocaleString()} characters`),
			X.yellow(`Threshold: ${u.warnThreshold.toLocaleString()} characters`),
			'',
			X.gray('Suggestions to reduce output size:'),
			X.gray('  \u2022 Use --fields to select specific columns'),
			X.gray('  \u2022 Use --limit to reduce number of rows'),
			X.gray('  \u2022 Consider --format json for more compact output'),
			''
		].join(`
`);
	return '';
}
function k(D, u) {
	if (D) return D;
	let F = process.env.DATABASIN_OUTPUT_FORMAT;
	if (F === 'table' || F === 'json' || F === 'csv') return F;
	if (u) return u;
	return 'table';
}
function f(D, u, F = {}, E) {
	let B,
		C = Array.isArray(D) ? D : [D];
	switch (u) {
		case 'table':
			B = BD(C, F);
			break;
		case 'json':
			B = CD(D, F);
			break;
		case 'csv':
			B = AD(C, F);
			break;
		default:
			throw Error(`Unknown output format: ${u}`);
	}
	if (E) {
		let A = Q7(B, E);
		if (A) return A + B;
	}
	return B;
}
import S0 from 'process';
import h2 from 'process';
import j0 from 'process';
var G7 = (D, u, F, E) => {
		if (F === 'length' || F === 'prototype') return;
		if (F === 'arguments' || F === 'caller') return;
		let B = Object.getOwnPropertyDescriptor(D, F),
			C = Object.getOwnPropertyDescriptor(u, F);
		if (!K7(B, C) && E) return;
		Object.defineProperty(D, F, C);
	},
	K7 = function (D, u) {
		return (
			D === void 0 ||
			D.configurable ||
			(D.writable === u.writable &&
				D.enumerable === u.enumerable &&
				D.configurable === u.configurable &&
				(D.writable || D.value === u.value))
		);
	},
	U7 = (D, u) => {
		let F = Object.getPrototypeOf(u);
		if (F === Object.getPrototypeOf(D)) return;
		Object.setPrototypeOf(D, F);
	},
	M7 = (D, u) => `/* Wrapped ${D}*/
${u}`,
	W7 = Object.getOwnPropertyDescriptor(Function.prototype, 'toString'),
	R7 = Object.getOwnPropertyDescriptor(Function.prototype.toString, 'name'),
	q7 = (D, u, F) => {
		let E = F === '' ? '' : `with ${F.trim()}() `,
			B = M7.bind(null, E, u.toString());
		Object.defineProperty(B, 'name', R7);
		let { writable: C, enumerable: A, configurable: _ } = W7;
		Object.defineProperty(D, 'toString', { value: B, writable: C, enumerable: A, configurable: _ });
	};
function wu(D, u, { ignoreNonConfigurable: F = !1 } = {}) {
	let { name: E } = D;
	for (let B of Reflect.ownKeys(u)) G7(D, u, B, F);
	return (U7(D, u), q7(D, u, E), D);
}
var T0 = new WeakMap(),
	P2 = (D, u = {}) => {
		if (typeof D !== 'function') throw TypeError('Expected a function');
		let F,
			E = 0,
			B = D.displayName || D.name || '<anonymous>',
			C = function (...A) {
				if ((T0.set(C, ++E), E === 1)) ((F = D.apply(this, A)), (D = void 0));
				else if (u.throw === !0) throw Error(`Function \`${B}\` can only be called once`);
				return F;
			};
		return (wu(C, D), T0.set(C, E), C);
	};
P2.callCount = (D) => {
	if (!T0.has(D))
		throw Error(`The given function \`${D.name}\` is not wrapped by the \`onetime\` package`);
	return T0.get(D);
};
var S2 = P2;
var PD = [];
PD.push('SIGHUP', 'SIGINT', 'SIGTERM');
if (process.platform !== 'win32')
	PD.push(
		'SIGALRM',
		'SIGABRT',
		'SIGVTALRM',
		'SIGXCPU',
		'SIGXFSZ',
		'SIGUSR2',
		'SIGTRAP',
		'SIGSYS',
		'SIGQUIT',
		'SIGIOT'
	);
if (process.platform === 'linux') PD.push('SIGIO', 'SIGPOLL', 'SIGPWR', 'SIGSTKFLT');
var I0 = (D) =>
		!!D &&
		typeof D === 'object' &&
		typeof D.removeListener === 'function' &&
		typeof D.emit === 'function' &&
		typeof D.reallyExit === 'function' &&
		typeof D.listeners === 'function' &&
		typeof D.kill === 'function' &&
		typeof D.pid === 'number' &&
		typeof D.on === 'function',
	bu = Symbol.for('signal-exit emitter'),
	ku = globalThis,
	L7 = Object.defineProperty.bind(Object);
class w2 {
	emitted = { afterExit: !1, exit: !1 };
	listeners = { afterExit: [], exit: [] };
	count = 0;
	id = Math.random();
	constructor() {
		if (ku[bu]) return ku[bu];
		L7(ku, bu, { value: this, writable: !1, enumerable: !1, configurable: !1 });
	}
	on(D, u) {
		this.listeners[D].push(u);
	}
	removeListener(D, u) {
		let F = this.listeners[D],
			E = F.indexOf(u);
		if (E === -1) return;
		if (E === 0 && F.length === 1) F.length = 0;
		else F.splice(E, 1);
	}
	emit(D, u, F) {
		if (this.emitted[D]) return !1;
		this.emitted[D] = !0;
		let E = !1;
		for (let B of this.listeners[D]) E = B(u, F) === !0 || E;
		if (D === 'exit') E = this.emit('afterExit', u, F) || E;
		return E;
	}
}
class vu {}
var V7 = (D) => {
	return {
		onExit(u, F) {
			return D.onExit(u, F);
		},
		load() {
			return D.load();
		},
		unload() {
			return D.unload();
		}
	};
};
class b2 extends vu {
	onExit() {
		return () => {};
	}
	load() {}
	unload() {}
}
class k2 extends vu {
	#A = xu.platform === 'win32' ? 'SIGINT' : 'SIGHUP';
	#F = new w2();
	#D;
	#B;
	#z;
	#u = {};
	#C = !1;
	constructor(D) {
		super();
		((this.#D = D), (this.#u = {}));
		for (let u of PD)
			this.#u[u] = () => {
				let F = this.#D.listeners(u),
					{ count: E } = this.#F,
					B = D;
				if (
					typeof B.__signal_exit_emitter__ === 'object' &&
					typeof B.__signal_exit_emitter__.count === 'number'
				)
					E += B.__signal_exit_emitter__.count;
				if (F.length === E) {
					this.unload();
					let C = this.#F.emit('exit', null, u),
						A = u === 'SIGHUP' ? this.#A : u;
					if (!C) D.kill(D.pid, A);
				}
			};
		((this.#z = D.reallyExit), (this.#B = D.emit));
	}
	onExit(D, u) {
		if (!I0(this.#D)) return () => {};
		if (this.#C === !1) this.load();
		let F = u?.alwaysLast ? 'afterExit' : 'exit';
		return (
			this.#F.on(F, D),
			() => {
				if (
					(this.#F.removeListener(F, D),
					this.#F.listeners.exit.length === 0 && this.#F.listeners.afterExit.length === 0)
				)
					this.unload();
			}
		);
	}
	load() {
		if (this.#C) return;
		((this.#C = !0), (this.#F.count += 1));
		for (let D of PD)
			try {
				let u = this.#u[D];
				if (u) this.#D.on(D, u);
			} catch (u) {}
		((this.#D.emit = (D, ...u) => {
			return this.#H(D, ...u);
		}),
			(this.#D.reallyExit = (D) => {
				return this.#E(D);
			}));
	}
	unload() {
		if (!this.#C) return;
		((this.#C = !1),
			PD.forEach((D) => {
				let u = this.#u[D];
				if (!u) throw Error('Listener not defined for signal: ' + D);
				try {
					this.#D.removeListener(D, u);
				} catch (F) {}
			}),
			(this.#D.emit = this.#B),
			(this.#D.reallyExit = this.#z),
			(this.#F.count -= 1));
	}
	#E(D) {
		if (!I0(this.#D)) return 0;
		return (
			(this.#D.exitCode = D || 0),
			this.#F.emit('exit', this.#D.exitCode, null),
			this.#z.call(this.#D, this.#D.exitCode)
		);
	}
	#H(D, ...u) {
		let F = this.#B;
		if (D === 'exit' && I0(this.#D)) {
			if (typeof u[0] === 'number') this.#D.exitCode = u[0];
			let E = F.call(this.#D, D, ...u);
			return (this.#F.emit('exit', this.#D.exitCode, null), E);
		} else return F.call(this.#D, D, ...u);
	}
}
var xu = globalThis.process,
	{ onExit: x2, load: j_, unload: O_ } = V7(I0(xu) ? new k2(xu) : new b2());
var v2 = j0.stderr.isTTY ? j0.stderr : j0.stdout.isTTY ? j0.stdout : void 0,
	N7 = v2
		? S2(() => {
				x2(
					() => {
						v2.write('\x1B[?25h');
					},
					{ alwaysLast: !0 }
				);
			})
		: () => {},
	y2 = N7;
var O0 = !1,
	fD = {};
fD.show = (D = h2.stderr) => {
	if (!D.isTTY) return;
	((O0 = !1), D.write('\x1B[?25h'));
};
fD.hide = (D = h2.stderr) => {
	if (!D.isTTY) return;
	(y2(), (O0 = !0), D.write('\x1B[?25l'));
};
fD.toggle = (D, u) => {
	if (D !== void 0) O0 = D;
	if (O0) fD.show(u);
	else fD.hide(u);
};
var yu = fD;
var F0 = aD(hu(), 1);
import t from 'process';
function fu() {
	if (t.platform !== 'win32') return t.env.TERM !== 'linux';
	return (
		Boolean(t.env.CI) ||
		Boolean(t.env.WT_SESSION) ||
		Boolean(t.env.TERMINUS_SUBLIME) ||
		t.env.ConEmuTask === '{cmd::Cmder}' ||
		t.env.TERM_PROGRAM === 'Terminus-Sublime' ||
		t.env.TERM_PROGRAM === 'vscode' ||
		t.env.TERM === 'xterm-256color' ||
		t.env.TERM === 'alacritty' ||
		t.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
	);
}
var I7 = {
		info: X.blue('\u2139'),
		success: X.green('\u2714'),
		warning: X.yellow('\u26A0'),
		error: X.red('\u2716')
	},
	j7 = {
		info: X.blue('i'),
		success: X.green('\u221A'),
		warning: X.yellow('\u203C'),
		error: X.red('\xD7')
	},
	O7 = fu() ? I7 : j7,
	D0 = O7;
function gu({ onlyFirst: D = !1 } = {}) {
	return new RegExp(
		'(?:\\u001B\\][\\s\\S]*?(?:\\u0007|\\u001B\\u005C|\\u009C))|[\\u001B\\u009B][[\\]()#;?]*(?:\\d{1,4}(?:[;:]\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]',
		D ? void 0 : 'g'
	);
}
var P7 = gu();
function u0(D) {
	if (typeof D !== 'string') throw TypeError(`Expected a \`string\`, got \`${typeof D}\``);
	return D.replace(P7, '');
}
function d2(D) {
	return (
		D === 161 ||
		D === 164 ||
		D === 167 ||
		D === 168 ||
		D === 170 ||
		D === 173 ||
		D === 174 ||
		(D >= 176 && D <= 180) ||
		(D >= 182 && D <= 186) ||
		(D >= 188 && D <= 191) ||
		D === 198 ||
		D === 208 ||
		D === 215 ||
		D === 216 ||
		(D >= 222 && D <= 225) ||
		D === 230 ||
		(D >= 232 && D <= 234) ||
		D === 236 ||
		D === 237 ||
		D === 240 ||
		D === 242 ||
		D === 243 ||
		(D >= 247 && D <= 250) ||
		D === 252 ||
		D === 254 ||
		D === 257 ||
		D === 273 ||
		D === 275 ||
		D === 283 ||
		D === 294 ||
		D === 295 ||
		D === 299 ||
		(D >= 305 && D <= 307) ||
		D === 312 ||
		(D >= 319 && D <= 322) ||
		D === 324 ||
		(D >= 328 && D <= 331) ||
		D === 333 ||
		D === 338 ||
		D === 339 ||
		D === 358 ||
		D === 359 ||
		D === 363 ||
		D === 462 ||
		D === 464 ||
		D === 466 ||
		D === 468 ||
		D === 470 ||
		D === 472 ||
		D === 474 ||
		D === 476 ||
		D === 593 ||
		D === 609 ||
		D === 708 ||
		D === 711 ||
		(D >= 713 && D <= 715) ||
		D === 717 ||
		D === 720 ||
		(D >= 728 && D <= 731) ||
		D === 733 ||
		D === 735 ||
		(D >= 768 && D <= 879) ||
		(D >= 913 && D <= 929) ||
		(D >= 931 && D <= 937) ||
		(D >= 945 && D <= 961) ||
		(D >= 963 && D <= 969) ||
		D === 1025 ||
		(D >= 1040 && D <= 1103) ||
		D === 1105 ||
		D === 8208 ||
		(D >= 8211 && D <= 8214) ||
		D === 8216 ||
		D === 8217 ||
		D === 8220 ||
		D === 8221 ||
		(D >= 8224 && D <= 8226) ||
		(D >= 8228 && D <= 8231) ||
		D === 8240 ||
		D === 8242 ||
		D === 8243 ||
		D === 8245 ||
		D === 8251 ||
		D === 8254 ||
		D === 8308 ||
		D === 8319 ||
		(D >= 8321 && D <= 8324) ||
		D === 8364 ||
		D === 8451 ||
		D === 8453 ||
		D === 8457 ||
		D === 8467 ||
		D === 8470 ||
		D === 8481 ||
		D === 8482 ||
		D === 8486 ||
		D === 8491 ||
		D === 8531 ||
		D === 8532 ||
		(D >= 8539 && D <= 8542) ||
		(D >= 8544 && D <= 8555) ||
		(D >= 8560 && D <= 8569) ||
		D === 8585 ||
		(D >= 8592 && D <= 8601) ||
		D === 8632 ||
		D === 8633 ||
		D === 8658 ||
		D === 8660 ||
		D === 8679 ||
		D === 8704 ||
		D === 8706 ||
		D === 8707 ||
		D === 8711 ||
		D === 8712 ||
		D === 8715 ||
		D === 8719 ||
		D === 8721 ||
		D === 8725 ||
		D === 8730 ||
		(D >= 8733 && D <= 8736) ||
		D === 8739 ||
		D === 8741 ||
		(D >= 8743 && D <= 8748) ||
		D === 8750 ||
		(D >= 8756 && D <= 8759) ||
		D === 8764 ||
		D === 8765 ||
		D === 8776 ||
		D === 8780 ||
		D === 8786 ||
		D === 8800 ||
		D === 8801 ||
		(D >= 8804 && D <= 8807) ||
		D === 8810 ||
		D === 8811 ||
		D === 8814 ||
		D === 8815 ||
		D === 8834 ||
		D === 8835 ||
		D === 8838 ||
		D === 8839 ||
		D === 8853 ||
		D === 8857 ||
		D === 8869 ||
		D === 8895 ||
		D === 8978 ||
		(D >= 9312 && D <= 9449) ||
		(D >= 9451 && D <= 9547) ||
		(D >= 9552 && D <= 9587) ||
		(D >= 9600 && D <= 9615) ||
		(D >= 9618 && D <= 9621) ||
		D === 9632 ||
		D === 9633 ||
		(D >= 9635 && D <= 9641) ||
		D === 9650 ||
		D === 9651 ||
		D === 9654 ||
		D === 9655 ||
		D === 9660 ||
		D === 9661 ||
		D === 9664 ||
		D === 9665 ||
		(D >= 9670 && D <= 9672) ||
		D === 9675 ||
		(D >= 9678 && D <= 9681) ||
		(D >= 9698 && D <= 9701) ||
		D === 9711 ||
		D === 9733 ||
		D === 9734 ||
		D === 9737 ||
		D === 9742 ||
		D === 9743 ||
		D === 9756 ||
		D === 9758 ||
		D === 9792 ||
		D === 9794 ||
		D === 9824 ||
		D === 9825 ||
		(D >= 9827 && D <= 9829) ||
		(D >= 9831 && D <= 9834) ||
		D === 9836 ||
		D === 9837 ||
		D === 9839 ||
		D === 9886 ||
		D === 9887 ||
		D === 9919 ||
		(D >= 9926 && D <= 9933) ||
		(D >= 9935 && D <= 9939) ||
		(D >= 9941 && D <= 9953) ||
		D === 9955 ||
		D === 9960 ||
		D === 9961 ||
		(D >= 9963 && D <= 9969) ||
		D === 9972 ||
		(D >= 9974 && D <= 9977) ||
		D === 9979 ||
		D === 9980 ||
		D === 9982 ||
		D === 9983 ||
		D === 10045 ||
		(D >= 10102 && D <= 10111) ||
		(D >= 11094 && D <= 11097) ||
		(D >= 12872 && D <= 12879) ||
		(D >= 57344 && D <= 63743) ||
		(D >= 65024 && D <= 65039) ||
		D === 65533 ||
		(D >= 127232 && D <= 127242) ||
		(D >= 127248 && D <= 127277) ||
		(D >= 127280 && D <= 127337) ||
		(D >= 127344 && D <= 127373) ||
		D === 127375 ||
		D === 127376 ||
		(D >= 127387 && D <= 127404) ||
		(D >= 917760 && D <= 917999) ||
		(D >= 983040 && D <= 1048573) ||
		(D >= 1048576 && D <= 1114109)
	);
}
function c2(D) {
	return D === 12288 || (D >= 65281 && D <= 65376) || (D >= 65504 && D <= 65510);
}
function l2(D) {
	return (
		(D >= 4352 && D <= 4447) ||
		D === 8986 ||
		D === 8987 ||
		D === 9001 ||
		D === 9002 ||
		(D >= 9193 && D <= 9196) ||
		D === 9200 ||
		D === 9203 ||
		D === 9725 ||
		D === 9726 ||
		D === 9748 ||
		D === 9749 ||
		(D >= 9776 && D <= 9783) ||
		(D >= 9800 && D <= 9811) ||
		D === 9855 ||
		(D >= 9866 && D <= 9871) ||
		D === 9875 ||
		D === 9889 ||
		D === 9898 ||
		D === 9899 ||
		D === 9917 ||
		D === 9918 ||
		D === 9924 ||
		D === 9925 ||
		D === 9934 ||
		D === 9940 ||
		D === 9962 ||
		D === 9970 ||
		D === 9971 ||
		D === 9973 ||
		D === 9978 ||
		D === 9981 ||
		D === 9989 ||
		D === 9994 ||
		D === 9995 ||
		D === 10024 ||
		D === 10060 ||
		D === 10062 ||
		(D >= 10067 && D <= 10069) ||
		D === 10071 ||
		(D >= 10133 && D <= 10135) ||
		D === 10160 ||
		D === 10175 ||
		D === 11035 ||
		D === 11036 ||
		D === 11088 ||
		D === 11093 ||
		(D >= 11904 && D <= 11929) ||
		(D >= 11931 && D <= 12019) ||
		(D >= 12032 && D <= 12245) ||
		(D >= 12272 && D <= 12287) ||
		(D >= 12289 && D <= 12350) ||
		(D >= 12353 && D <= 12438) ||
		(D >= 12441 && D <= 12543) ||
		(D >= 12549 && D <= 12591) ||
		(D >= 12593 && D <= 12686) ||
		(D >= 12688 && D <= 12773) ||
		(D >= 12783 && D <= 12830) ||
		(D >= 12832 && D <= 12871) ||
		(D >= 12880 && D <= 42124) ||
		(D >= 42128 && D <= 42182) ||
		(D >= 43360 && D <= 43388) ||
		(D >= 44032 && D <= 55203) ||
		(D >= 63744 && D <= 64255) ||
		(D >= 65040 && D <= 65049) ||
		(D >= 65072 && D <= 65106) ||
		(D >= 65108 && D <= 65126) ||
		(D >= 65128 && D <= 65131) ||
		(D >= 94176 && D <= 94180) ||
		(D >= 94192 && D <= 94198) ||
		(D >= 94208 && D <= 101589) ||
		(D >= 101631 && D <= 101662) ||
		(D >= 101760 && D <= 101874) ||
		(D >= 110576 && D <= 110579) ||
		(D >= 110581 && D <= 110587) ||
		D === 110589 ||
		D === 110590 ||
		(D >= 110592 && D <= 110882) ||
		D === 110898 ||
		(D >= 110928 && D <= 110930) ||
		D === 110933 ||
		(D >= 110948 && D <= 110951) ||
		(D >= 110960 && D <= 111355) ||
		(D >= 119552 && D <= 119638) ||
		(D >= 119648 && D <= 119670) ||
		D === 126980 ||
		D === 127183 ||
		D === 127374 ||
		(D >= 127377 && D <= 127386) ||
		(D >= 127488 && D <= 127490) ||
		(D >= 127504 && D <= 127547) ||
		(D >= 127552 && D <= 127560) ||
		D === 127568 ||
		D === 127569 ||
		(D >= 127584 && D <= 127589) ||
		(D >= 127744 && D <= 127776) ||
		(D >= 127789 && D <= 127797) ||
		(D >= 127799 && D <= 127868) ||
		(D >= 127870 && D <= 127891) ||
		(D >= 127904 && D <= 127946) ||
		(D >= 127951 && D <= 127955) ||
		(D >= 127968 && D <= 127984) ||
		D === 127988 ||
		(D >= 127992 && D <= 128062) ||
		D === 128064 ||
		(D >= 128066 && D <= 128252) ||
		(D >= 128255 && D <= 128317) ||
		(D >= 128331 && D <= 128334) ||
		(D >= 128336 && D <= 128359) ||
		D === 128378 ||
		D === 128405 ||
		D === 128406 ||
		D === 128420 ||
		(D >= 128507 && D <= 128591) ||
		(D >= 128640 && D <= 128709) ||
		D === 128716 ||
		(D >= 128720 && D <= 128722) ||
		(D >= 128725 && D <= 128728) ||
		(D >= 128732 && D <= 128735) ||
		D === 128747 ||
		D === 128748 ||
		(D >= 128756 && D <= 128764) ||
		(D >= 128992 && D <= 129003) ||
		D === 129008 ||
		(D >= 129292 && D <= 129338) ||
		(D >= 129340 && D <= 129349) ||
		(D >= 129351 && D <= 129535) ||
		(D >= 129648 && D <= 129660) ||
		(D >= 129664 && D <= 129674) ||
		(D >= 129678 && D <= 129734) ||
		D === 129736 ||
		(D >= 129741 && D <= 129756) ||
		(D >= 129759 && D <= 129770) ||
		(D >= 129775 && D <= 129784) ||
		(D >= 131072 && D <= 196605) ||
		(D >= 196608 && D <= 262141)
	);
}
function S7(D) {
	if (!Number.isSafeInteger(D)) throw TypeError(`Expected a code point, got \`${typeof D}\`.`);
}
function p2(D, { ambiguousAsWide: u = !1 } = {}) {
	if ((S7(D), c2(D) || l2(D) || (u && d2(D)))) return 2;
	return 1;
}
var a2 = () => {
	return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E-\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED8\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])))?))?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3C-\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC2\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF]|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
};
var w7 = new Intl.Segmenter(),
	b7 = /^\p{Default_Ignorable_Code_Point}$/u;
function mu(D, u = {}) {
	if (typeof D !== 'string' || D.length === 0) return 0;
	let { ambiguousIsNarrow: F = !0, countAnsiEscapeCodes: E = !1 } = u;
	if (!E) D = u0(D);
	if (D.length === 0) return 0;
	let B = 0,
		C = { ambiguousAsWide: !F };
	for (let { segment: A } of w7.segment(D)) {
		let _ = A.codePointAt(0);
		if (_ <= 31 || (_ >= 127 && _ <= 159)) continue;
		if ((_ >= 8203 && _ <= 8207) || _ === 65279) continue;
		if (
			(_ >= 768 && _ <= 879) ||
			(_ >= 6832 && _ <= 6911) ||
			(_ >= 7616 && _ <= 7679) ||
			(_ >= 8400 && _ <= 8447) ||
			(_ >= 65056 && _ <= 65071)
		)
			continue;
		if (_ >= 55296 && _ <= 57343) continue;
		if (_ >= 65024 && _ <= 65039) continue;
		if (b7.test(A)) continue;
		if (a2().test(A)) {
			B += 2;
			continue;
		}
		B += p2(_, C);
	}
	return B;
}
function du({ stream: D = process.stdout } = {}) {
	return Boolean(D && D.isTTY && process.env.TERM !== 'dumb' && !('CI' in process.env));
}
import i2 from 'process';
function cu() {
	let { env: D } = i2,
		{ TERM: u, TERM_PROGRAM: F } = D;
	if (i2.platform !== 'win32') return u !== 'linux';
	return (
		Boolean(D.WT_SESSION) ||
		Boolean(D.TERMINUS_SUBLIME) ||
		D.ConEmuTask === '{cmd::Cmder}' ||
		F === 'Terminus-Sublime' ||
		F === 'vscode' ||
		u === 'xterm-256color' ||
		u === 'alacritty' ||
		u === 'rxvt-unicode' ||
		u === 'rxvt-unicode-256color' ||
		D.TERMINAL_EMULATOR === 'JetBrains-JediTerm'
	);
}
import _D from 'process';
var k7 = 3;
class n2 {
	#A = 0;
	start() {
		if ((this.#A++, this.#A === 1)) this.#F();
	}
	stop() {
		if (this.#A <= 0) throw Error('`stop` called more times than `start`');
		if ((this.#A--, this.#A === 0)) this.#D();
	}
	#F() {
		if (_D.platform === 'win32' || !_D.stdin.isTTY) return;
		(_D.stdin.setRawMode(!0), _D.stdin.on('data', this.#B), _D.stdin.resume());
	}
	#D() {
		if (!_D.stdin.isTTY) return;
		(_D.stdin.off('data', this.#B), _D.stdin.pause(), _D.stdin.setRawMode(!1));
	}
	#B(D) {
		if (D[0] === k7) _D.emit('SIGINT');
	}
}
var x7 = new n2(),
	lu = x7;
var v7 = aD(hu(), 1);
class s2 {
	#A = 0;
	#F = !1;
	#D = 0;
	#B = -1;
	#z = 0;
	#u;
	#C;
	#E;
	#H;
	#Q;
	#Z;
	#X;
	#Y;
	#G;
	#_;
	#$;
	color;
	constructor(D) {
		if (typeof D === 'string') D = { text: D };
		if (
			((this.#u = { color: 'cyan', stream: S0.stderr, discardStdin: !0, hideCursor: !0, ...D }),
			(this.color = this.#u.color),
			(this.spinner = this.#u.spinner),
			(this.#Q = this.#u.interval),
			(this.#E = this.#u.stream),
			(this.#Z =
				typeof this.#u.isEnabled === 'boolean' ? this.#u.isEnabled : du({ stream: this.#E })),
			(this.#X = typeof this.#u.isSilent === 'boolean' ? this.#u.isSilent : !1),
			(this.text = this.#u.text),
			(this.prefixText = this.#u.prefixText),
			(this.suffixText = this.#u.suffixText),
			(this.indent = this.#u.indent),
			S0.env.NODE_ENV === 'test')
		)
			((this._stream = this.#E),
				(this._isEnabled = this.#Z),
				Object.defineProperty(this, '_linesToClear', {
					get() {
						return this.#A;
					},
					set(u) {
						this.#A = u;
					}
				}),
				Object.defineProperty(this, '_frameIndex', {
					get() {
						return this.#B;
					}
				}),
				Object.defineProperty(this, '_lineCount', {
					get() {
						return this.#D;
					}
				}));
	}
	get indent() {
		return this.#Y;
	}
	set indent(D = 0) {
		if (!(D >= 0 && Number.isInteger(D)))
			throw Error('The `indent` option must be an integer from 0 and up');
		((this.#Y = D), this.#J());
	}
	get interval() {
		return this.#Q ?? this.#C.interval ?? 100;
	}
	get spinner() {
		return this.#C;
	}
	set spinner(D) {
		if (((this.#B = -1), (this.#Q = void 0), typeof D === 'object')) {
			if (D.frames === void 0) throw Error('The given spinner must have a `frames` property');
			this.#C = D;
		} else if (!cu()) this.#C = F0.default.line;
		else if (D === void 0) this.#C = F0.default.dots;
		else if (D !== 'default' && F0.default[D]) this.#C = F0.default[D];
		else
			throw Error(
				`There is no built-in spinner named '${D}'. See https://github.com/sindresorhus/cli-spinners/blob/main/spinners.json for a full list.`
			);
	}
	get text() {
		return this.#G;
	}
	set text(D = '') {
		((this.#G = D), this.#J());
	}
	get prefixText() {
		return this.#_;
	}
	set prefixText(D = '') {
		((this.#_ = D), this.#J());
	}
	get suffixText() {
		return this.#$;
	}
	set suffixText(D = '') {
		((this.#$ = D), this.#J());
	}
	get isSpinning() {
		return this.#H !== void 0;
	}
	#K(D = this.#_, u = ' ') {
		if (typeof D === 'string' && D !== '') return D + u;
		if (typeof D === 'function') return D() + u;
		return '';
	}
	#U(D = this.#$, u = ' ') {
		if (typeof D === 'string' && D !== '') return u + D;
		if (typeof D === 'function') return u + D();
		return '';
	}
	#J() {
		let D = this.#E.columns ?? 80,
			u = this.#K(this.#_, '-'),
			F = this.#U(this.#$, '-'),
			E = ' '.repeat(this.#Y) + u + '--' + this.#G + '--' + F;
		this.#D = 0;
		for (let B of u0(E).split(`
`))
			this.#D += Math.max(1, Math.ceil(mu(B, { countAnsiEscapeCodes: !0 }) / D));
	}
	get isEnabled() {
		return this.#Z && !this.#X;
	}
	set isEnabled(D) {
		if (typeof D !== 'boolean') throw TypeError('The `isEnabled` option must be a boolean');
		this.#Z = D;
	}
	get isSilent() {
		return this.#X;
	}
	set isSilent(D) {
		if (typeof D !== 'boolean') throw TypeError('The `isSilent` option must be a boolean');
		this.#X = D;
	}
	frame() {
		let D = Date.now();
		if (this.#B === -1 || D - this.#z >= this.interval)
			((this.#B = ++this.#B % this.#C.frames.length), (this.#z = D));
		let { frames: u } = this.#C,
			F = u[this.#B];
		if (this.color) F = X[this.color](F);
		let E = typeof this.#_ === 'string' && this.#_ !== '' ? this.#_ + ' ' : '',
			B = typeof this.text === 'string' ? ' ' + this.text : '',
			C = typeof this.#$ === 'string' && this.#$ !== '' ? ' ' + this.#$ : '';
		return E + F + B + C;
	}
	clear() {
		if (!this.#Z || !this.#E.isTTY) return this;
		this.#E.cursorTo(0);
		for (let D = 0; D < this.#A; D++) {
			if (D > 0) this.#E.moveCursor(0, -1);
			this.#E.clearLine(1);
		}
		if (this.#Y || this.lastIndent !== this.#Y) this.#E.cursorTo(this.#Y);
		return ((this.lastIndent = this.#Y), (this.#A = 0), this);
	}
	render() {
		if (this.#X) return this;
		return (this.clear(), this.#E.write(this.frame()), (this.#A = this.#D), this);
	}
	start(D) {
		if (D) this.text = D;
		if (this.#X) return this;
		if (!this.#Z) {
			if (this.text)
				this.#E.write(`- ${this.text}
`);
			return this;
		}
		if (this.isSpinning) return this;
		if (this.#u.hideCursor) yu.hide(this.#E);
		if (this.#u.discardStdin && S0.stdin.isTTY) ((this.#F = !0), lu.start());
		return (this.render(), (this.#H = setInterval(this.render.bind(this), this.interval)), this);
	}
	stop() {
		if (!this.#Z) return this;
		if (
			(clearInterval(this.#H), (this.#H = void 0), (this.#B = 0), this.clear(), this.#u.hideCursor)
		)
			yu.show(this.#E);
		if (this.#u.discardStdin && S0.stdin.isTTY && this.#F) (lu.stop(), (this.#F = !1));
		return this;
	}
	succeed(D) {
		return this.stopAndPersist({ symbol: D0.success, text: D });
	}
	fail(D) {
		return this.stopAndPersist({ symbol: D0.error, text: D });
	}
	warn(D) {
		return this.stopAndPersist({ symbol: D0.warning, text: D });
	}
	info(D) {
		return this.stopAndPersist({ symbol: D0.info, text: D });
	}
	stopAndPersist(D = {}) {
		if (this.#X) return this;
		let u = D.prefixText ?? this.#_,
			F = this.#K(u, ' '),
			E = D.symbol ?? ' ',
			B = D.text ?? this.text,
			A = typeof B === 'string' ? (E ? ' ' : '') + B : '',
			_ = D.suffixText ?? this.#$,
			$ = this.#U(_, ' '),
			Z =
				F +
				E +
				A +
				$ +
				`
`;
		return (this.stop(), this.#E.write(Z), this);
	}
}
function pu(D) {
	return new s2(D);
}
var gD = { verbose: !1, debug: !1, noColor: !1 };
function E0(D) {
	if (process.env.NO_COLOR) return !1;
	if (gD.noColor) return !1;
	if (D?.colors === !1) return !1;
	return !0;
}
function w0(D) {
	if (D?.debug && !gD.debug) return !1;
	if (D?.verbose && !gD.verbose && !gD.debug) return !1;
	return !0;
}
function N(D, u = {}) {
	let F = E0(),
		E = pu({
			text: D,
			color: u.color || 'cyan',
			spinner: u.spinner || 'dots',
			stream: u.stream || process.stdout,
			isEnabled: process.stdout.isTTY && F
		});
	return (E.start(), E);
}
function R(D, u) {
	if (u) D.succeed(u);
	else D.succeed();
}
function q(D, u, F) {
	if (u) D.fail(u);
	else D.fail();
	if (F && gD.debug) console.error(X.gray(F.stack || F.message));
}
function I(D, u) {
	if (!w0(u)) return;
	let E = E0(u) ? X.cyan('\u2139') : '\u2139';
	console.log(`${E} ${D}`);
}
function SD(D, u) {
	if (!w0(u)) return;
	let E = E0(u) ? X.green('\u2714') : '\u2714';
	console.log(`${E} ${D}`);
}
function GD(D, u) {
	if (!w0(u)) return;
	let E = E0(u) ? X.yellow('\u26A0') : '\u26A0';
	console.log(`${E} ${D}`);
}
function U(D, u, F) {
	if (!w0(F)) return;
	let B = E0(F) ? X.red('\u2716') : '\u2716';
	if ((console.error(`${B} ${D}`), u && gD.debug)) console.error(X.gray(u.stack || u.message));
}
function ND(D, u = 50000, F) {
	if (D < u) return;
	let E = Math.round(D * 0.25),
		B = D > 1e5,
		C = B ? X.red('\u26A0') : X.yellow('\u26A0'),
		A = B ? 'HIGH' : 'MODERATE';
	if (
		(console.log(),
		console.log(`${C} ${A} TOKEN USAGE WARNING`),
		console.log(X.gray(`   Response size: ${y7(D)}`)),
		console.log(X.gray(`   Estimated tokens: ~${E.toLocaleString()}`)),
		F && F.length > 0)
	)
		(console.log(),
			console.log(X.cyan('   Suggestions to reduce token usage:')),
			F.forEach((_) => {
				console.log(X.gray(`   \u2022 ${_}`));
			}));
	console.log();
}
function r2() {
	return Date.now();
}
function t2(D) {
	let u = Date.now() - D;
	if (u < 1000) return `${u}ms`;
	if (u < 60000) return `${(u / 1000).toFixed(1)}s`;
	let F = Math.floor(u / 60000),
		E = Math.floor((u % 60000) / 1000);
	return `${F}m ${E}s`;
}
function y7(D) {
	if (D < 1024) return `${D} B`;
	else if (D < 1048576) return `${(D / 1024).toFixed(1)} KB`;
	else return `${(D / 1048576).toFixed(1)} MB`;
}
function h7(D) {
	return {
		id: D.id || '-',
		email: D.email || '-',
		name: `${D.firstName || ''} ${D.lastName || ''}`.trim() || '-',
		organization:
			D.organizationMemberships && D.organizationMemberships.length > 0
				? D.organizationMemberships[0].organizationName || '-'
				: '-',
		role:
			D.organizationMemberships && D.organizationMemberships.length > 0
				? D.organizationMemberships[0].role || '-'
				: '-'
	};
}
function f7(D, u) {
	let F = u.split(',').map((B) => B.trim()),
		E = {};
	for (let B of F) if (B in D) E[B] = D[B];
	return E;
}
function o2() {
	let D = new d('auth').description('Authentication and token management');
	return (
		D.command('verify')
			.description('Verify authentication token validity')
			.action(async (u, F) => {
				let E = F.optsWithGlobals(),
					B = E._config,
					C = E._clients.base,
					A = N('Verifying token...');
				try {
					if (await C.ping())
						try {
							let Z = await E._clients.projects.getCurrentUser(),
								z = `${Z.firstName || ''} ${Z.lastName || ''}`.trim(),
								J = Z.email;
							if ((R(A, 'Token is valid'), console.log(`  User: ${J}`), z))
								console.log(`  Name: ${z}`);
							if (Z.organizationMemberships && Z.organizationMemberships.length > 0) {
								let Q = Z.organizationMemberships[0].organizationName;
								if (Q) console.log(`  Organization: ${Q}`);
							}
							process.exit(0);
						} catch ($) {
							(R(A, 'Token is valid'), process.exit(0));
						}
					else
						(q(A, 'Token is invalid or expired'),
							console.log("  Suggestion: Run 'databasin auth login' to authenticate"),
							process.exit(1));
				} catch (_) {
					if (_ instanceof v) {
						if (_.statusCode === 401 || _.statusCode === 403)
							(q(A, 'Authentication failed (401 Unauthorized)'),
								console.log('  Suggestion: Your token may be expired. Please obtain a new token.'));
						else if (
							(q(A, `API error (${_.statusCode} ${_.message})`),
							console.log('  Endpoint: /api/ping'),
							_.details)
						)
							console.log(`  Message: ${_.details}`);
						process.exit(1);
					} else if (_ instanceof VD)
						(q(A, 'Failed to connect to API'),
							console.log(`  Endpoint: ${B.apiUrl}/api/ping`),
							console.log('  Suggestion: Check that the API server is running and accessible'),
							process.exit(1));
					else if (_ instanceof Error) {
						if (_.message.includes('No authentication token found'))
							(q(A, 'No authentication token found'),
								console.log(
									'  Suggestion: Set DATABASIN_TOKEN environment variable or create ~/.databasin/.token file'
								),
								process.exit(1));
						if ((q(A, 'Verification failed'), U(_.message), B.debug && _.stack))
							console.error(_.stack);
						process.exit(1);
					} else (q(A, 'Verification failed'), U(String(_)), process.exit(1));
				}
			}),
		D.command('whoami')
			.description('Display current authenticated user information')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(async (u, F) => {
				let E = F.optsWithGlobals(),
					B = E._config,
					C = E._clients.projects,
					A = N('Fetching user information...');
				try {
					let _ = await C.getCurrentUser();
					R(A);
					let $ = h7(_);
					if (u.fields) $ = f7($, u.fields);
					let Z = B.output.format,
						z = f([$], Z, { colors: B.output.colors });
					(console.log(z), process.exit(0));
				} catch (_) {
					if (_ instanceof v) {
						if (_.statusCode === 401 || _.statusCode === 403)
							(q(A, 'Authentication failed (401 Unauthorized)'),
								console.log('  Suggestion: Your token may be expired. Please obtain a new token.'));
						else if (
							(q(A, `API error (${_.statusCode} ${_.message})`),
							console.log('  Endpoint: /api/my/account'),
							_.details)
						)
							console.log(`  Message: ${_.details}`);
						process.exit(1);
					} else if (_ instanceof VD)
						(q(A, 'Failed to connect to API'),
							console.log(`  Endpoint: ${B.apiUrl}/api/my/account`),
							console.log('  Suggestion: Check that the API server is running and accessible'),
							process.exit(1));
					else if (_ instanceof Error) {
						if (_.message.includes('No authentication token found'))
							(q(A, 'No authentication token found'),
								console.log(
									'  Suggestion: Set DATABASIN_TOKEN environment variable or create ~/.databasin/.token file'
								),
								process.exit(1));
						if ((q(A, 'Failed to fetch user information'), U(_.message), B.debug && _.stack))
							console.error(_.stack);
						process.exit(1);
					} else (q(A, 'Failed to fetch user information'), U(String(_)), process.exit(1));
				}
			}),
		D
	);
}
var Q0 = aD(X1(), 1);
async function p(D, u = 'Select a project') {
	let F = await D.list();
	if (!Array.isArray(F) || F.length === 0) throw Error('No projects available');
	let E = F.map((C) => ({ title: `${C.name} (${C.internalID})`, value: C.internalID })),
		B = await Q0.default({ type: 'select', name: 'project', message: u, choices: E });
	if (!B.project) throw Error('Selection cancelled');
	return B.project;
}
async function DD(D, u = !0) {
	let F = await Q0.default({ type: 'confirm', name: 'confirmed', message: D, initial: u });
	if (F.confirmed === void 0) return !1;
	return F.confirmed;
}
async function g(D, u, F) {
	let E = await Q0.default({ type: 'text', name: 'value', message: D, initial: u, validate: F });
	if (!E.value) throw Error('Input cancelled');
	return E.value;
}
async function kD(D, u) {
	let F = Array.isArray(u[0]) ? u : u.map((B) => ({ title: B, value: B })),
		E = await Q0.default({ type: 'select', name: 'selected', message: D, choices: F });
	if (!E.selected) throw Error('Selection cancelled');
	return E.selected;
}
function UF(D) {
	if (!D) return;
	return D.split(',').map((u) => u.trim());
}
function c4(D, u) {
	let E = (u || Object.keys(D))
		.filter((B) => D[B] !== void 0)
		.map((B) => {
			let C = D[B];
			if (C === null || C === void 0) C = '-';
			else if (Array.isArray(C)) C = JSON.stringify(C);
			else if (typeof C === 'object') C = JSON.stringify(C);
			else C = String(C);
			return { Field: B, Value: C };
		});
	return BD(E, { fields: ['Field', 'Value'] });
}
async function l4(D, u) {
	let F = u.optsWithGlobals(),
		E = F._config,
		B = F._clients.projects,
		C;
	try {
		let A = F.json ? 'json' : F.csv ? 'csv' : void 0,
			_ = k(A, E.output.format),
			$ = D.count ? 'Fetching project count...' : 'Fetching projects...';
		if (_ === 'table') C = N($);
		let Z = {};
		if (D.count) Z.count = !0;
		if (D.limit) Z.limit = D.limit;
		if (D.fields) Z.fields = D.fields;
		let z = await B.list(Z);
		if (D.count && typeof z === 'object' && 'count' in z) {
			if (C) R(C, `Project count: ${z.count}`);
			else console.log(z.count);
			return;
		}
		let J = Array.isArray(z) ? z : [];
		if (D.status && J.length > 0) {
			let H = D.status.toLowerCase();
			J = J.filter((K) => {
				return (K.status || (K.deleted ? 'inactive' : 'active')).toLowerCase() === H;
			});
		}
		if (C) {
			if (J.length === 0) {
				R(C, 'No projects found');
				return;
			}
			R(C, `Fetched ${J.length} project${J.length === 1 ? '' : 's'}`);
		}
		let Q = UF(D.fields),
			Y = f(
				J,
				_,
				{ fields: Q, colors: E.output.colors },
				{ warnThreshold: E.tokenEfficiency.warnThreshold, enabled: !0 }
			);
		if ((console.log(Y), !D.count && !D.limit && J.length > 50))
			ND(Y.length, E.tokenEfficiency.warnThreshold, [
				'Use --count to get only the count',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results'
			]);
	} catch (A) {
		if (C) q(C, 'Failed to fetch projects');
		throw (U('Error fetching projects', A instanceof Error ? A : void 0), A);
	}
}
async function p4(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.projects,
		A;
	try {
		let _ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			$ = k(_, B.output.format),
			Z = D;
		if (!Z) Z = await p(C, 'Select a project');
		if ($ === 'table') A = N('Fetching project details...');
		let z = await C.get(Z);
		if (A) R(A, 'Project retrieved');
		let J = UF(u.fields),
			Q;
		if ($ === 'json') {
			let Y = J ? Object.fromEntries(Object.entries(z).filter(([H]) => J.includes(H))) : z;
			Q = CD(Y, { colors: B.output.colors });
		} else if ($ === 'csv') Q = AD([z], { fields: J, colors: B.output.colors });
		else Q = c4(z, J);
		console.log(Q);
	} catch (_) {
		if (A) q(A, 'Failed to fetch project');
		if (_ instanceof Error)
			if (_.message.includes('404'))
				(U('Project not found'),
					console.error(X.gray(`  Project ID: ${D}`)),
					console.error(
						X.gray("  Suggestion: Run 'databasin projects list' to see available projects")
					));
			else if (_.message.includes('403'))
				(U('Access denied'),
					console.error(X.gray(`  Project ID: ${D}`)),
					console.error(X.gray("  Suggestion: You don't have permission to access this project")));
			else U('Error fetching project', _);
		throw _;
	}
}
async function a4(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.projects,
		A;
	try {
		let _ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			$ = k(_, B.output.format),
			Z = D;
		if (!Z) Z = await p(C, 'Select a project');
		if ($ === 'table') A = N('Fetching project users...');
		let z = await C.getProjectUsers(Z),
			J = Array.isArray(z) ? z : [];
		if (A) {
			if (J.length === 0) {
				R(A, 'No users found');
				return;
			}
			R(A, `Fetched ${J.length} user${J.length === 1 ? '' : 's'}`);
		}
		let Q = UF(u.fields),
			Y = f(J, $, { fields: Q, colors: B.output.colors });
		console.log(Y);
	} catch (_) {
		if (A) q(A, 'Failed to fetch project users');
		if (_ instanceof Error)
			if (_.message.includes('404'))
				(U('Project not found'), console.error(X.gray(`  Project ID: ${D}`)));
			else if (_.message.includes('403'))
				(U('Access denied'), console.error(X.gray(`  Project ID: ${D}`)));
			else U('Error fetching project users', _);
		throw _;
	}
}
async function i4(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.projects,
		A;
	try {
		let _ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			$ = k(_, B.output.format),
			Z = D;
		if (!Z) Z = await p(C, 'Select a project');
		if ($ === 'table') A = N('Fetching project statistics...');
		let z = await C.getProjectStats(Z);
		if (A) R(A, 'Statistics retrieved');
		let J;
		if ($ === 'json') J = CD(z, { colors: B.output.colors });
		else if ($ === 'csv') {
			let Q = Object.entries(z).map(([Y, H]) => ({ Metric: Y, Count: H }));
			J = AD(Q, { colors: B.output.colors });
		} else {
			let Q = Object.entries(z)
				.filter(([Y, H]) => H !== void 0)
				.map(([Y, H]) => ({ Metric: Y, Count: H ?? 0 }));
			J = BD(Q, { fields: ['Metric', 'Count'] });
		}
		console.log(J);
	} catch (_) {
		if (A) q(A, 'Failed to fetch project statistics');
		if (_ instanceof Error)
			if (_.message.includes('404'))
				(U('Project not found'), console.error(X.gray(`  Project ID: ${D}`)));
			else if (_.message.includes('403'))
				(U('Access denied'), console.error(X.gray(`  Project ID: ${D}`)));
			else U('Error fetching project statistics', _);
		throw _;
	}
}
function Y1() {
	let D = new d('projects').description('Manage DataBasin projects');
	return (
		D.command('list')
			.description('List all accessible projects')
			.option('--count', 'Return only the count of projects')
			.option('--limit <number>', 'Limit number of results', parseInt)
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.option('--status <status>', 'Filter by status (active, inactive)')
			.action(l4),
		D.command('get')
			.description('Get detailed project information')
			.argument('[id]', 'Project ID (will prompt if not provided)')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(p4),
		D.command('users')
			.description('List users in a project')
			.argument('[id]', 'Project ID (will prompt if not provided)')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(a4),
		D.command('stats')
			.description('Show project statistics')
			.argument('[id]', 'Project ID (will prompt if not provided)')
			.action(i4),
		D
	);
}
import { readFileSync as n4 } from 'fs';
function z1(D) {
	if (!D) return;
	return D.split(',').map((u) => u.trim());
}
function s4(D, u) {
	let E = (u || Object.keys(D))
		.filter((B) => D[B] !== void 0)
		.map((B) => {
			let C = D[B];
			if (C === null || C === void 0) C = '-';
			else if (B === 'configuration' || (typeof C === 'object' && !Array.isArray(C)))
				C = JSON.stringify(C, null, 2);
			else if (Array.isArray(C)) C = JSON.stringify(C);
			else C = String(C);
			return { Field: B, Value: C };
		});
	return BD(E, { fields: ['Field', 'Value'] });
}
async function r4(D, u, F = 'Select a connector') {
	let E = await D.list(u, {
		count: !1,
		fields: 'connectorID,connectorName,connectorType',
		limit: 100
	});
	if (!Array.isArray(E) || E.length === 0) throw Error('No connectors available');
	let B = E.map((A) => ({
		title: `${A.connectorName} (${A.connectorType}) - ${A.connectorID}`,
		value: A.connectorID
	}));
	return await kD(F, B);
}
function H1(D) {
	try {
		let u = n4(D, 'utf-8');
		return JSON.parse(u);
	} catch (u) {
		if (u instanceof Error) {
			if (u.code === 'ENOENT') throw Error(`File not found: ${D}`);
			else if (u instanceof SyntaxError)
				throw Error(`Invalid JSON in file: ${D}
${u.message}`);
		}
		throw u;
	}
}
async function t4(D, u, F) {
	if (
		(console.log(
			X.cyan(`
\uD83D\uDCDD Interactive Connector Creation
`)
		),
		!F)
	)
		F = await p(u, 'Select project for connector');
	let E = await g('Enter connector name', void 0, (A) => {
			if (A.length < 3) return 'Name must be at least 3 characters';
			return !0;
		}),
		B = await kD('Select connector type', [
			{ title: 'Database', value: 'database' },
			{ title: 'Application/API', value: 'app' },
			{ title: 'File & API', value: 'file & api' },
			{ title: 'Cloud Storage', value: 'cloud' }
		]);
	console.log(
		X.gray(`
Enter connection details (press Enter to skip optional fields):`)
	);
	let C = {};
	if (B === 'database') {
		if (
			((C.host = await g('Host', 'localhost')),
			(C.port = await g('Port', '5432')),
			(C.database = await g('Database name')),
			(C.username = await g('Username')),
			await DD('Include password in configuration?', !1))
		)
			C.password = await g('Password');
	} else if (B === 'app' || B === 'file & api') {
		if (((C.baseUrl = await g('API Base URL')), await DD('Requires authentication?', !0)))
			C.authType = await kD('Authentication type', ['oauth2', 'apikey', 'basic']);
	}
	return { connectorName: E, connectorType: B, internalID: F, configuration: C, status: 'active' };
}
async function o4(D, u) {
	console.log(
		X.cyan(`
\uD83D\uDCDD Interactive Connector Update
`)
	);
	let F = N('Fetching current connector...'),
		E = await D.get(u);
	(R(F, 'Connector loaded'),
		console.log(
			X.gray(`
Current configuration:`)
		),
		console.log(X.gray(`  Name: ${E.connectorName}`)),
		console.log(X.gray(`  Type: ${E.connectorType}`)),
		console.log(X.gray(`  Status: ${E.status}`)));
	let B = {};
	if (
		await DD(
			`
Update connector name?`,
			!1
		)
	)
		B.connectorName = await g('Enter new name', E.connectorName, ($) => {
			if ($.length < 3) return 'Name must be at least 3 characters';
			return !0;
		});
	if (await DD('Update status?', !1))
		B.status = await kD('Select new status', ['active', 'inactive', 'error', 'pending']);
	if (await DD('Update configuration?', !1)) {
		(console.log(
			X.yellow(`
\u26A0 Configuration update requires manual editing or JSON file.`)
		),
			console.log(X.gray('Current configuration:')),
			console.log(X.gray(JSON.stringify(E.configuration, null, 2))));
		let $ = await g(`
Enter new configuration as JSON (or press Enter to keep current)`);
		if ($)
			try {
				B.configuration = JSON.parse($);
			} catch (Z) {
				throw Error('Invalid JSON for configuration');
			}
	}
	if (Object.keys(B).length === 0) throw Error('No updates specified');
	return B;
}
async function e4(D, u) {
	let F = u.optsWithGlobals(),
		E = F._config,
		B = F._clients.connectors,
		C;
	try {
		let A = F.json ? 'json' : F.csv ? 'csv' : void 0,
			_ = k(A, E.output.format),
			$ = {};
		if (D.full) {
			if ((($.count = !1), D.fields)) $.fields = D.fields;
			if (D.limit) $.limit = D.limit;
		} else $.count = !0;
		let Z = $.count ? 'Fetching connector count...' : 'Fetching connectors...';
		if (_ === 'table') C = N(Z);
		let z = await B.list(D.project, $);
		if (typeof z === 'object' && 'count' in z) {
			if (C) R(C, `Total connectors: ${z.count}`);
			else console.log(z.count);
			if (_ === 'table') {
				if ((console.log(), GD('Use --full to fetch full connector objects'), D.project))
					I(`Filtered by project: ${D.project}`);
			}
			return;
		}
		let J = Array.isArray(z) ? z : [];
		if (C) {
			if (J.length === 0) {
				R(C, 'No connectors found');
				return;
			}
			R(C, `Fetched ${J.length} connector${J.length === 1 ? '' : 's'}`);
		}
		let Q = z1(D.fields),
			Y = f(J, _, { fields: Q, colors: E.output.colors });
		(console.log(), console.log(Y));
		let H = Y.length;
		if (H > E.tokenEfficiency.warnThreshold)
			ND(H, E.tokenEfficiency.warnThreshold, [
				'Use count mode (default) to get count only',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results',
				'Use --project to filter by project'
			]);
	} catch (A) {
		if (C) q(C, 'Failed to fetch connectors');
		throw (U('Error fetching connectors', A instanceof Error ? A : void 0), A);
	}
}
async function D5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.connectors,
		A;
	try {
		let _ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			$ = k(_, B.output.format),
			Z = D;
		if (!Z) Z = await r4(C, u.project, 'Select a connector');
		if ($ === 'table') A = N('Fetching connector details...');
		let z = await C.get(Z);
		if (A) R(A, 'Connector retrieved');
		let J = z1(u.fields),
			Q;
		if ($ === 'json') {
			let Y = J ? Object.fromEntries(Object.entries(z).filter(([H]) => J.includes(H))) : z;
			Q = CD(Y, { colors: B.output.colors });
		} else if ($ === 'csv') Q = AD([z], { fields: J, colors: B.output.colors });
		else Q = s4(z, J);
		(console.log(), console.log(Q));
	} catch (_) {
		if (A) q(A, 'Failed to fetch connector');
		if (_ instanceof Error)
			if (_.message.includes('404'))
				(U('Connector not found'),
					console.error(X.gray(`  Connector ID: ${D}`)),
					console.error(
						X.gray(
							"  Suggestion: Run 'databasin connectors list --full' to see available connectors"
						)
					));
			else if (_.message.includes('403'))
				(U('Access denied'),
					console.error(X.gray(`  Connector ID: ${D}`)),
					console.error(
						X.gray("  Suggestion: You don't have permission to access this connector")
					));
			else U('Error fetching connector', _);
		throw _;
	}
}
async function u5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._clients.connectors,
		C = E._clients.projects,
		A;
	try {
		let _;
		if (D) {
			if ((I(`Reading connector configuration from: ${D}`), (_ = H1(D)), u.project))
				_.internalID = u.project;
			if (!_.connectorName) throw Error('Missing required field: connectorName');
			if (!_.connectorType) throw Error('Missing required field: connectorType');
		} else _ = await t4(B, C, u.project);
		if (
			(console.log(
				X.cyan(`
\uD83D\uDCCB Connector Configuration:`)
			),
			console.log(X.gray(`  Name: ${_.connectorName}`)),
			console.log(X.gray(`  Type: ${_.connectorType}`)),
			console.log(X.gray(`  Project: ${_.internalID}`)),
			console.log(),
			!(await DD('Create this connector?', !0)))
		) {
			GD('Connector creation cancelled');
			return;
		}
		A = N('Creating connector...');
		let Z = await B.create(_);
		(R(A, 'Connector created successfully'),
			console.log(),
			SD('Connector Details:'),
			console.log(X.gray(`  ID: ${Z.connectorID}`)),
			console.log(X.gray(`  Name: ${Z.connectorName}`)),
			console.log(X.gray(`  Type: ${Z.connectorType}`)),
			console.log(X.gray(`  Status: ${Z.status}`)));
	} catch (_) {
		if (A) q(A, 'Failed to create connector');
		if (_ instanceof Error)
			if (_.message.includes('validation'))
				(U('Invalid connector configuration'),
					console.error(X.gray(`  Error: ${_.message}`)),
					console.error(X.gray('  Suggestion: Check the connector configuration schema')));
			else U('Error creating connector', _);
		throw _;
	}
}
async function F5(D, u, F, E) {
	let C = E.optsWithGlobals()._clients.connectors,
		A;
	try {
		let _;
		if (u) (I(`Reading update configuration from: ${u}`), (_ = H1(u)));
		else _ = await o4(C, D);
		if (
			(console.log(
				X.cyan(`
\uD83D\uDCCB Fields to Update:`)
			),
			Object.entries(_).forEach(([z, J]) => {
				let Q = typeof J === 'object' ? JSON.stringify(J, null, 2) : String(J);
				console.log(X.gray(`  ${z}: ${Q}`));
			}),
			console.log(),
			!(await DD('Apply these updates?', !0)))
		) {
			GD('Update cancelled');
			return;
		}
		A = N('Updating connector...');
		let Z = await C.update(D, _);
		(R(A, 'Connector updated successfully'),
			console.log(),
			SD('Updated Connector:'),
			console.log(X.gray(`  ID: ${Z.connectorID}`)),
			console.log(X.gray(`  Name: ${Z.connectorName}`)),
			console.log(X.gray(`  Status: ${Z.status}`)),
			console.log(X.gray(`  Updated Fields: ${Object.keys(_).join(', ')}`)));
	} catch (_) {
		if (A) q(A, 'Failed to update connector');
		if (_ instanceof Error)
			if (_.message.includes('404'))
				(U('Connector not found'), console.error(X.gray(`  Connector ID: ${D}`)));
			else if (_.message.includes('validation'))
				(U('Invalid update configuration'), console.error(X.gray(`  Error: ${_.message}`)));
			else U('Error updating connector', _);
		throw _;
	}
}
async function E5(D, u, F) {
	let B = F.optsWithGlobals()._clients.connectors,
		C;
	try {
		C = N('Fetching connector details...');
		let A = await B.get(D);
		if (
			(R(C, `Connector: ${A.connectorName} (${A.connectorID})`),
			console.log(),
			console.log(X.red('\u26A0 WARNING: This action cannot be undone!')),
			console.log(X.gray(`  Connector: ${A.connectorName}`)),
			console.log(X.gray(`  Type: ${A.connectorType}`)),
			console.log(X.gray(`  ID: ${A.connectorID}`)),
			console.log(),
			!u.yes)
		) {
			if (!(await DD('Are you sure you want to delete this connector?', !1))) {
				GD('Deletion cancelled');
				return;
			}
		}
		((C = N('Deleting connector...')),
			await B.delete(D),
			R(C, 'Connector deleted successfully'),
			console.log(),
			SD(`Deleted connector: ${A.connectorName}`));
	} catch (A) {
		if (C) q(C, 'Failed to delete connector');
		if (A instanceof Error)
			if (A.message.includes('404'))
				(U('Connector not found'), console.error(X.gray(`  Connector ID: ${D}`)));
			else if (A.message.includes('403'))
				(U('Access denied'),
					console.error(X.gray(`  Connector ID: ${D}`)),
					console.error(
						X.gray("  Suggestion: You don't have permission to delete this connector")
					));
			else U('Error deleting connector', A);
		throw A;
	}
}
function J1() {
	let D = new d('connectors').description('Manage data connectors');
	return (
		D.command('list')
			.description('List connectors (count mode by default for efficiency)')
			.option('-p, --project <id>', 'Filter by project ID')
			.option('--full', 'Fetch full connector objects (may return large response)')
			.option('--fields <fields>', 'Comma-separated list of fields (only with --full)')
			.option('--limit <number>', 'Limit number of results (only with --full)', parseInt)
			.action(e4),
		D.command('get')
			.description('Get connector details')
			.argument('[id]', 'Connector ID (will prompt if not provided)')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.option('-p, --project <id>', 'Filter connector list by project (for interactive prompt)')
			.action(D5),
		D.command('create')
			.description('Create a new connector')
			.argument('[file]', 'JSON file with connector configuration (interactive if not provided)')
			.option('-p, --project <id>', 'Project ID for the connector')
			.action(u5),
		D.command('update')
			.description('Update connector configuration')
			.argument('<id>', 'Connector ID')
			.argument('[file]', 'JSON file with updated configuration (interactive if not provided)')
			.option('-p, --project <id>', 'Project ID (for filtering in interactive mode)')
			.action(F5),
		D.command('delete')
			.description('Delete a connector')
			.argument('<id>', 'Connector ID')
			.option('-y, --yes', 'Skip confirmation prompt')
			.option('-p, --project <id>', 'Project ID (not used, for consistency)')
			.action(E5),
		D
	);
}
import { readFileSync as B5 } from 'fs';
function Q1(D) {
	if (!D) return;
	return D.split(',').map((u) => u.trim());
}
function C5(D, u) {
	let E = (u || Object.keys(D))
		.filter((B) => D[B] !== void 0)
		.map((B) => {
			let C = D[B];
			if (C === null || C === void 0) C = '-';
			else if (Array.isArray(C)) C = `${C.length} items`;
			else if (typeof C === 'object') C = JSON.stringify(C);
			else C = String(C);
			return { Field: B, Value: C };
		});
	return BD(E, { fields: ['Field', 'Value'] });
}
async function MF(D, u, F = 'Select a pipeline') {
	let E = await D.list(u);
	if (!Array.isArray(E) || E.length === 0) throw Error('No pipelines available in this project');
	let B = E.map((A) => ({
		title: `${A.pipelineName} (${A.pipelineID}) - ${A.status}`,
		value: String(A.pipelineID)
	}));
	return await kD(F, B);
}
async function A5(D, u) {
	let F = u.optsWithGlobals(),
		E = F._config,
		B = F._clients.pipelines,
		C = F._clients.projects,
		A;
	try {
		let _ = D.project;
		if (!_)
			try {
				_ = await p(C, 'Select project to list pipelines');
			} catch (M) {
				throw new FD('Project selection cancelled', 'projectId', [
					'Use --project flag to specify project ID'
				]);
			}
		if (!_ || _.trim().length === 0)
			throw new FD('Project ID is required for listing pipelines', 'projectId', [
				'Use --project flag or select a project from the interactive prompt'
			]);
		let $ = F.json ? 'json' : F.csv ? 'csv' : void 0,
			Z = k($, E.output.format),
			z = D.count ? 'Fetching pipeline count...' : 'Fetching pipelines...';
		if (Z === 'table') A = N(z);
		let J = {};
		if (D.count) J.count = !0;
		if (D.limit) J.limit = D.limit;
		if (D.fields) J.fields = D.fields;
		if (D.status) J.status = D.status;
		let Q = await B.list(_, J);
		if (D.count && typeof Q === 'object' && 'count' in Q) {
			if (A) R(A, `Pipeline count: ${Q.count}`);
			else console.log(Q.count);
			return;
		}
		let Y = Array.isArray(Q) ? Q : [];
		if (A) {
			if (Y.length === 0) {
				(R(A, 'No pipelines found in this project'),
					I('Create a pipeline with: databasin pipelines create'));
				return;
			}
			R(A, `Fetched ${Y.length} pipeline${Y.length === 1 ? '' : 's'}`);
		}
		let H = Q1(D.fields),
			K = f(
				Y,
				Z,
				{ fields: H, colors: E.output.colors },
				{ warnThreshold: E.tokenEfficiency.warnThreshold, enabled: !0 }
			);
		if ((console.log(K), !D.count && !D.limit && Y.length > 50))
			ND(K.length, E.tokenEfficiency.warnThreshold, [
				'Use --count to get only the count',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results'
			]);
	} catch (_) {
		if (A) q(A, 'Failed to fetch pipelines');
		if (_ instanceof FD) throw _;
		if (_ instanceof v)
			if (_.statusCode === 400)
				(U('Bad request - verify project ID is correct'),
					console.error(X.gray(`  Project ID: ${D.project || 'not provided'}`)),
					console.error(
						X.gray("  Suggestion: Run 'databasin projects list' to see valid project IDs")
					));
			else if (_.statusCode === 403)
				(U('Access denied'),
					console.error(X.gray(`  Project ID: ${D.project}`)),
					console.error(
						X.gray("  Suggestion: You don't have permission to view pipelines in this project")
					));
			else U('Error fetching pipelines', _);
		else U('Error fetching pipelines', _ instanceof Error ? _ : void 0);
		throw _;
	}
}
async function _5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.pipelines,
		A = E._clients.projects,
		_;
	try {
		let $ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			Z = k($, B.output.format),
			z = D;
		if (!z) {
			let H = u.project;
			if (!H) H = await p(A, 'Select a project');
			z = await MF(C, H, 'Select a pipeline');
		}
		if (Z === 'table') _ = N('Fetching pipeline details...');
		let J = await C.get(z);
		if (_) R(_, 'Pipeline retrieved');
		let Q = Q1(u.fields),
			Y;
		if (Z === 'json') {
			let H = Q ? Object.fromEntries(Object.entries(J).filter(([K]) => Q.includes(K))) : J;
			Y = CD(H, { colors: B.output.colors });
		} else if (Z === 'csv') Y = AD([J], { fields: Q, colors: B.output.colors });
		else Y = C5(J, Q);
		console.log(Y);
	} catch ($) {
		if (_) q(_, 'Failed to fetch pipeline');
		if ($ instanceof v)
			if ($.statusCode === 404)
				(U('Pipeline not found (404)'),
					console.error(X.gray(`  Pipeline ID: ${D}`)),
					console.error(
						X.gray(
							"  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines"
						)
					));
			else if ($.statusCode === 403)
				(U('Access denied (403)'),
					console.error(X.gray(`  Pipeline ID: ${D}`)),
					console.error(X.gray("  Suggestion: You don't have permission to access this pipeline")));
			else U('Error fetching pipeline', $);
		else if ($ instanceof Error) U('Error fetching pipeline', $);
		throw $;
	}
}
async function $5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.pipelines,
		A = E._clients.projects,
		_;
	try {
		let $;
		if (D) {
			I(`Reading pipeline configuration from: ${D}`);
			try {
				let z = B5(D, 'utf-8');
				$ = JSON.parse(z);
			} catch (z) {
				throw new FD(`Failed to read or parse pipeline configuration file: ${D}`, 'file', [
					'Ensure the file exists and is valid JSON',
					'Check the pipeline configuration schema'
				]);
			}
		} else {
			(I('Starting interactive pipeline creation wizard...'),
				GD('Interactive wizard is simplified - use a JSON file for complex pipelines'));
			let z = u.project;
			if (!z) z = await p(A, 'Select project for pipeline');
			let J = await g('Enter pipeline name:', void 0, (K) => {
					if (!K || K.trim().length === 0) return 'Pipeline name is required';
					return !0;
				}),
				Q = await g('Enter source connector ID (or leave blank):', void 0),
				Y = await g('Enter target connector ID (or leave blank):', void 0),
				H = await g(
					'Enter schedule (cron format, leave blank for manual execution):',
					void 0,
					(K) => {
						if (!K) return !0;
						if (!/^[\d\*\,\-\/\s]+$/.test(K))
							return 'Invalid cron format (use digits, *, -, /, and spaces)';
						return !0;
					}
				);
			if ((($ = { pipelineName: J.trim() }), Q && Q.trim().length > 0))
				$.sourceConnectorId = Q.trim();
			if (Y && Y.trim().length > 0) $.targetConnectorId = Y.trim();
			if (H && H.trim().length > 0) $.configuration = { schedule: H.trim() };
			I('Artifact configuration not yet supported in interactive mode');
		}
		_ = N('Creating pipeline...');
		let Z = await C.create($);
		if (
			(R(_, 'Pipeline created successfully'),
			console.log(),
			SD(`Pipeline created: ${Z.pipelineName}`),
			console.log(X.gray(`  ID: ${Z.pipelineID}`)),
			console.log(X.gray(`  Status: ${Z.status}`)),
			console.log(X.gray(`  Enabled: ${Z.enabled}`)),
			Z.sourceConnectorId)
		)
			console.log(X.gray(`  Source: ${Z.sourceConnectorId}`));
		if (Z.targetConnectorId) console.log(X.gray(`  Target: ${Z.targetConnectorId}`));
		(console.log(), I(`Run the pipeline with: databasin pipelines run ${Z.pipelineID}`));
	} catch ($) {
		if (_) q(_, 'Failed to create pipeline');
		if ($ instanceof FD) throw $;
		if ($ instanceof v)
			if ($.statusCode === 400) {
				if (
					(U('Invalid pipeline configuration (400)'),
					console.error(X.gray('  Suggestion: Check the pipeline configuration schema')),
					$.responseBody)
				)
					console.error(X.gray(`  Details: ${JSON.stringify($.responseBody, null, 2)}`));
			} else U('Error creating pipeline', $);
		else if ($ instanceof Error) U('Error creating pipeline', $);
		throw $;
	}
}
async function Z5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._clients.pipelines,
		C = E._clients.projects,
		A;
	try {
		let _ = D;
		if (!_) {
			let Z = u.project;
			if (!Z) Z = await p(C, 'Select a project');
			_ = await MF(B, Z, 'Select pipeline to run');
		}
		A = N('Starting pipeline execution...');
		let $ = await B.run(_);
		if (
			(R(A, 'Pipeline execution started'),
			console.log(),
			SD('Pipeline execution started'),
			console.log(X.gray(`  Status: ${$.status}`)),
			$.jobId)
		)
			console.log(X.gray(`  Job ID: ${$.jobId}`));
		if ($.message) console.log(X.gray(`  Message: ${$.message}`));
		if (u.wait)
			(console.log(),
				I('Waiting for pipeline to complete...'),
				GD('Polling not yet implemented - pipeline is running in background'));
		else (console.log(), I(`Use 'databasin pipelines logs ${_}' to view logs`));
	} catch (_) {
		if (A) q(A, 'Failed to start pipeline execution');
		if (_ instanceof v)
			if (_.statusCode === 404)
				(U('Pipeline not found (404)'),
					console.error(X.gray(`  Pipeline ID: ${D}`)),
					console.error(
						X.gray(
							"  Suggestion: Run 'databasin pipelines list --project <id>' to see available pipelines"
						)
					));
			else if (_.statusCode === 400) {
				if (
					(U('Pipeline cannot be executed (400)'),
					console.error(X.gray(`  Pipeline ID: ${D}`)),
					console.error(X.gray('  Suggestion: Check pipeline status and configuration')),
					_.responseBody)
				)
					console.error(X.gray(`  Details: ${JSON.stringify(_.responseBody, null, 2)}`));
			} else U('Error executing pipeline', _);
		else if (_ instanceof Error) U('Error executing pipeline', _);
		throw _;
	}
}
async function X5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._clients.pipelines,
		C = E._clients.projects;
	try {
		let A = D;
		if (!A) {
			let _ = u.project;
			if (!_) _ = await p(C, 'Select a project');
			A = await MF(B, _, 'Select pipeline to view logs');
		}
		if (
			(GD('Pipeline logs endpoint not yet implemented'),
			console.log(),
			console.log(X.gray(`  Pipeline ID: ${A}`)),
			u.execution)
		)
			console.log(X.gray(`  Execution ID: ${u.execution}`));
		if (u.limit) console.log(X.gray(`  Limit: ${u.limit} entries`));
		(console.log(),
			I('Log viewing will be available in a future release'),
			I('For now, check pipeline execution status in the DataBasin UI'));
	} catch (A) {
		if (A instanceof Error) U('Error fetching logs', A);
		throw A;
	}
}
function G1() {
	let D = new d('pipelines').description('Manage data pipelines');
	return (
		D.command('list')
			.description('List pipelines in a project')
			.option('-p, --project <id>', 'Project ID (required)')
			.option('--count', 'Return only the count of pipelines')
			.option('--limit <number>', 'Limit number of results', parseInt)
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.option('--status <status>', 'Filter by status (active, inactive, running, error, pending)')
			.action(A5),
		D.command('get')
			.description('Get detailed pipeline information')
			.argument('[id]', 'Pipeline ID (will prompt if not provided)')
			.option('-p, --project <id>', 'Project ID (for interactive selection)')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(_5),
		D.command('create')
			.description('Create a new pipeline')
			.argument('[file]', 'JSON file with pipeline configuration')
			.option('-p, --project <id>', 'Project ID (for interactive mode)')
			.action($5),
		D.command('run')
			.description('Execute a pipeline immediately')
			.argument('[id]', 'Pipeline ID (will prompt if not provided)')
			.option('-p, --project <id>', 'Project ID (for interactive selection)')
			.option('--wait', 'Wait for pipeline execution to complete')
			.action(Z5),
		D.command('logs')
			.description('View pipeline execution logs')
			.argument('[id]', 'Pipeline ID (will prompt if not provided)')
			.option('-p, --project <id>', 'Project ID (for interactive selection)')
			.option('--execution <id>', 'Specific execution ID')
			.option('--limit <number>', 'Limit number of log entries', parseInt)
			.action(X5),
		D
	);
}
import { readFileSync as Y5 } from 'fs';
function t0(D) {
	if (!D) return;
	return D.split(',').map((u) => u.trim());
}
function z5(D) {
	try {
		return Y5(D, 'utf-8').trim();
	} catch (u) {
		throw new yD(`Query file not found: ${D}`, D, 'read');
	}
}
function H5(D, u, F) {
	if (!D.rows || D.rows.length === 0) return 'No rows returned';
	return f(D.rows, u, { colors: F });
}
async function J5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.sql,
		A;
	try {
		let _ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			$ = k(_, B.output.format);
		if ($ === 'table') A = N('Fetching catalogs...');
		let Z = await C.listCatalogs(D);
		if (A) R(A, `Found ${Z.length} catalog${Z.length === 1 ? '' : 's'}`);
		if (Z.length === 0) {
			I('No catalogs found for this connector');
			return;
		}
		let z = t0(u.fields),
			J = f(Z, $, { fields: z, colors: B.output.colors });
		console.log(
			`
` + J
		);
	} catch (_) {
		if (A) q(A, 'Failed to fetch catalogs');
		if (_ instanceof v)
			if (_.statusCode === 404)
				(console.error(`\u2716 Connector not found (${_.statusCode})`),
					console.error(`  Connector ID: ${D}`),
					console.error(
						"  Suggestion: Run 'databasin connectors list --full' to see available connectors"
					));
			else if (_.statusCode === 403)
				(console.error(`\u2716 Access denied (${_.statusCode})`),
					console.error(`  Connector ID: ${D}`),
					console.error("  Suggestion: You don't have permission to query this connector"));
			else U('Error fetching catalogs', _);
		else U('Error fetching catalogs', _ instanceof Error ? _ : void 0);
		throw _;
	}
}
async function Q5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.sql,
		A;
	try {
		let _ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			$ = k(_, B.output.format);
		if ($ === 'table') A = N('Fetching schemas...');
		let Z = await C.listSchemas(D, u.catalog);
		if (A) R(A, `Found ${Z.length} schema${Z.length === 1 ? '' : 's'}`);
		if (Z.length === 0) {
			I(`No schemas found in catalog '${u.catalog}'`);
			return;
		}
		let z = t0(u.fields),
			J = f(Z, $, { fields: z, colors: B.output.colors });
		console.log(
			`
` + J
		);
	} catch (_) {
		if (A) q(A, 'Failed to fetch schemas');
		if (_ instanceof v)
			if (_.statusCode === 404)
				(console.error('\u2716 Catalog not found'),
					console.error(`  Catalog: ${u.catalog}`),
					console.error(
						`  Suggestion: Run 'databasin sql catalogs ${D}' to see available catalogs`
					));
			else if (_.statusCode === 403)
				(console.error(`\u2716 Access denied (${_.statusCode})`),
					console.error(`  Connector ID: ${D}`),
					console.error("  Suggestion: You don't have permission to query this connector"));
			else U('Error fetching schemas', _);
		else U('Error fetching schemas', _ instanceof Error ? _ : void 0);
		throw _;
	}
}
async function G5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.sql,
		A;
	try {
		let _ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			$ = k(_, B.output.format);
		if ($ === 'table') A = N('Fetching tables...');
		let Z = await C.listTables(D, u.catalog, u.schema);
		if (A) R(A, `Found ${Z.length} table${Z.length === 1 ? '' : 's'}`);
		if (Z.length === 0) {
			I(`No tables found in schema '${u.catalog}.${u.schema}'`);
			return;
		}
		let z = t0(u.fields),
			J = f(Z, $, { fields: z, colors: B.output.colors });
		console.log(
			`
` + J
		);
	} catch (_) {
		if (A) q(A, 'Failed to fetch tables');
		if (_ instanceof v)
			if (_.statusCode === 404)
				(console.error('\u2716 Schema not found'),
					console.error(`  Catalog: ${u.catalog}`),
					console.error(`  Schema: ${u.schema}`),
					console.error(
						`  Suggestion: Run 'databasin sql schemas ${D} --catalog ${u.catalog}' to see available schemas`
					));
			else if (_.statusCode === 403)
				(console.error(`\u2716 Access denied (${_.statusCode})`),
					console.error(`  Connector ID: ${D}`),
					console.error("  Suggestion: You don't have permission to query this connector"));
			else U('Error fetching tables', _);
		else U('Error fetching tables', _ instanceof Error ? _ : void 0);
		throw _;
	}
}
async function K5(D, u, F, E) {
	let B = E.optsWithGlobals(),
		C = B._config,
		A = B._clients.sql,
		_;
	try {
		let $ = B.json ? 'json' : B.csv ? 'csv' : void 0,
			Z = k($, C.output.format),
			z;
		if (F.file) (I(`Executing query from file: ${F.file}`), (z = z5(F.file)));
		else if (u) z = u.trim();
		else throw Error('No query provided. Use [query] argument or --file option.');
		if (F.limit && !z.toLowerCase().includes('limit'))
			z = `${z.replace(/;?\s*$/, '')} LIMIT ${F.limit}`;
		let J = r2();
		if (Z === 'table') _ = N('Executing query...');
		let Q = await A.executeQuery(D, z),
			Y = t2(J);
		if (!Q.success) {
			if (_) q(_, 'Query failed');
			throw (
				console.error(`  Error: ${Q.error || 'Unknown error'}`),
				console.error(`  Query: ${z.substring(0, 100)}${z.length > 100 ? '...' : ''}`),
				Error(Q.error || 'Query execution failed')
			);
		}
		if (_) R(_, `Query completed in ${Y}`);
		if (Q.rows && Q.rows.length > 0) {
			let H = t0(F.fields),
				K = H5(Q, Z, C.output.colors);
			(console.log(
				`
` + K
			),
				console.log(''),
				I(`Rows returned: ${Q.rows.length}`));
		} else I('Query completed successfully (no rows returned)');
	} catch ($) {
		if (_) q(_, 'Query failed');
		if ($ instanceof yD)
			(console.error('\u2716 Query file not found'),
				console.error(`  File: ${$.path}`),
				console.error('  Suggestion: Check that the file path is correct'));
		else if ($ instanceof v)
			if ($.statusCode === 404)
				(console.error(`\u2716 Connector not found (${$.statusCode})`),
					console.error(`  Connector ID: ${D}`),
					console.error(
						"  Suggestion: Run 'databasin connectors list --full' to see available connectors"
					));
			else if ($.statusCode === 403)
				(console.error(`\u2716 Access denied (${$.statusCode})`),
					console.error(`  Connector ID: ${D}`),
					console.error("  Suggestion: You don't have permission to query this connector"));
			else if ($.statusCode === 400)
				(console.error('\u2716 Query failed'),
					console.error('  Error: You have an error in your SQL syntax'),
					console.error('  Suggestion: Check your SQL syntax'));
			else U('Query execution failed', $);
		else U('Query execution failed', $ instanceof Error ? $ : void 0);
		throw $;
	}
}
function K1() {
	let D = new d('sql').description('Execute SQL queries and explore schemas');
	return (
		D.command('catalogs')
			.description('List catalogs for a connector')
			.argument('<connector-id>', 'Connector ID')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(J5),
		D.command('schemas')
			.description('List schemas in a catalog')
			.argument('<connector-id>', 'Connector ID')
			.requiredOption('-c, --catalog <name>', 'Catalog name')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(Q5),
		D.command('tables')
			.description('List tables in a schema')
			.argument('<connector-id>', 'Connector ID')
			.requiredOption('-c, --catalog <name>', 'Catalog name')
			.requiredOption('-s, --schema <name>', 'Schema name')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(G5),
		D.command('exec')
			.alias('execute')
			.description('Execute a SQL query')
			.argument('<connector-id>', 'Connector ID')
			.argument('[query]', 'SQL query to execute')
			.option('-f, --file <path>', 'Read query from file')
			.option('--limit <number>', 'Limit number of rows returned', parseInt)
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(K5),
		D
	);
}
function U1(D) {
	if (!D) return;
	return D.split(',').map((u) => u.trim());
}
function U5(D, u) {
	let E = (u || Object.keys(D))
		.filter((B) => D[B] !== void 0)
		.map((B) => {
			let C = D[B];
			if (C === null || C === void 0) C = '-';
			else if (Array.isArray(C)) C = JSON.stringify(C);
			else if (typeof C === 'object') C = JSON.stringify(C);
			else C = String(C);
			return { Field: B, Value: C };
		});
	return BD(E, { fields: ['Field', 'Value'] });
}
function M5(D) {
	if (!D) return '-';
	return (
		{
			'0 * * * *': 'Every hour',
			'0 0 * * *': 'Daily at midnight',
			'0 2 * * *': 'Daily at 2 AM',
			'0 0 * * 0': 'Weekly on Sunday',
			'0 0 * * 1': 'Weekly on Monday',
			'0 0 1 * *': 'Monthly on the 1st',
			'*/5 * * * *': 'Every 5 minutes',
			'*/10 * * * *': 'Every 10 minutes',
			'*/15 * * * *': 'Every 15 minutes',
			'*/30 * * * *': 'Every 30 minutes'
		}[D] || D
	);
}
async function W5(D, u) {
	let F = u.optsWithGlobals(),
		E = F._config,
		B = F._clients.automations,
		C = F._clients.projects,
		A;
	try {
		let _ = F.json ? 'json' : F.csv ? 'csv' : void 0,
			$ = k(_, E.output.format),
			Z = D.project;
		if (!Z) {
			if (await DD('Filter by project? (No = list all)', !1))
				try {
					Z = await p(C, 'Select project');
				} catch (W) {
					if (W instanceof Error && W.message.includes('cancel')) {
						I('Selection cancelled');
						return;
					}
					throw W;
				}
		}
		let z = D.count ? 'Fetching automation count...' : 'Fetching automations...';
		if ($ === 'table') A = N(z);
		let J = {};
		if (D.count) J.count = !0;
		if (D.limit) J.limit = D.limit;
		if (D.fields) J.fields = D.fields;
		if (D.active !== void 0) J.active = D.active;
		if (D.running !== void 0) J.running = D.running;
		let Q = await B.list(Z, J);
		if (Q === null) {
			if (A) R(A, 'No automations found');
			(console.log(''),
				I('No project specified - no automations returned'),
				I('Use --project flag to filter by project'));
			return;
		}
		if (D.count && typeof Q === 'object' && 'count' in Q) {
			if (A) R(A, `Automation count: ${Q.count}`);
			else console.log(Q.count);
			return;
		}
		let Y = Array.isArray(Q) ? Q : [];
		if (A) {
			if (Y.length === 0) {
				(R(A, 'No automations found'),
					console.log(''),
					I(`No automations found${Z ? ` in project ${Z}` : ''}`));
				return;
			}
			R(A, `Fetched ${Y.length} automation${Y.length === 1 ? '' : 's'}`);
		}
		let H = U1(D.fields),
			K = f(
				Y,
				$,
				{ fields: H, colors: E.output.colors },
				{ warnThreshold: E.tokenEfficiency.warnThreshold, enabled: !0 }
			);
		if (
			(console.log(
				`
` + K
			),
			!D.count && !D.limit && Y.length > 50)
		)
			ND(K.length, E.tokenEfficiency.warnThreshold, [
				'Use --count to get only the count',
				'Use --fields to limit displayed fields',
				'Use --limit to reduce number of results'
			]);
	} catch (_) {
		if (A) q(A, 'Failed to fetch automations');
		throw (U('Error fetching automations', _ instanceof Error ? _ : void 0), _);
	}
}
async function R5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.automations,
		A;
	try {
		let _ = E.json ? 'json' : E.csv ? 'csv' : void 0,
			$ = k(_, B.output.format);
		if ($ === 'table') A = N('Fetching automation details...');
		let Z = await C.get(D);
		if (A) R(A, 'Automation retrieved');
		let z = U1(u.fields),
			J;
		if ($ === 'json') {
			let Q = z ? Object.fromEntries(Object.entries(Z).filter(([Y]) => z.includes(Y))) : Z;
			J = CD(Q, { colors: B.output.colors });
		} else if ($ === 'csv') J = AD([Z], { fields: z, colors: B.output.colors });
		else {
			let Q = { ...Z };
			if (Z.jobRunSchedule) Q.schedule = `${Z.jobRunSchedule} (${M5(Z.jobRunSchedule)})`;
			if (Z.isActive !== void 0) Q.status = Z.isActive ? 'active' : 'inactive';
			J = U5(Q, z);
		}
		console.log(
			`
` + J
		);
	} catch (_) {
		if (A) q(A, 'Failed to fetch automation');
		if (_ instanceof Error)
			if (_.message.includes('404'))
				(U('Automation not found'),
					console.error(X.gray(`  Automation ID: ${D}`)),
					console.error(
						X.gray(
							"  Suggestion: Run 'databasin automations list --project <id>' to see available automations"
						)
					));
			else if (_.message.includes('403'))
				(U('Access denied'),
					console.error(X.gray(`  Automation ID: ${D}`)),
					console.error(
						X.gray("  Suggestion: You don't have permission to access this automation")
					));
			else U('Error fetching automation', _);
		throw _;
	}
}
async function q5(D, u, F) {
	let E = F.optsWithGlobals(),
		B = E._config,
		C = E._clients.automations,
		A;
	try {
		A = N('Starting automation execution...');
		let _ = await C.run(D);
		if (
			(R(A, 'Automation execution started'),
			console.log(X.cyan(`  Execution ID: ${_.jobId || 'N/A'}`)),
			console.log(X.cyan(`  Status: ${_.status || 'running'}`)),
			_.message)
		)
			console.log(X.gray(`  Message: ${_.message}`));
		(console.log(''),
			I('Automation is running in the background'),
			I(`Check status with 'databasin automations get ${D}'`));
	} catch (_) {
		if (A) q(A, 'Automation execution failed');
		if (_ instanceof Error)
			if (_.message.includes('404'))
				(U('Automation not found'),
					console.error(X.gray(`  Automation ID: ${D}`)),
					console.error(
						X.gray(
							"  Suggestion: Run 'databasin automations list --project <id>' to see available automations"
						)
					));
			else if (_.message.includes('403'))
				(U('Access denied'),
					console.error(X.gray(`  Automation ID: ${D}`)),
					console.error(X.gray("  Suggestion: You don't have permission to run this automation")));
			else if (_.message.includes('409'))
				(U('Automation is already running'),
					console.error(X.gray(`  Automation ID: ${D}`)),
					console.error(X.gray('  Suggestion: Wait for current execution to complete')));
			else if (_.message.toLowerCase().includes('already running'))
				(U('Automation is already running'),
					console.error(X.gray(`  Automation ID: ${D}`)),
					console.error(X.gray('  Suggestion: Wait for current execution to complete')));
			else U('Error executing automation', _);
		throw _;
	}
}
function M1() {
	let D = new d('automations').description('Manage automation workflows');
	return (
		D.command('list')
			.description('List automations')
			.option('-p, --project <id>', 'Filter by project ID')
			.option('--count', 'Return only the count of automations')
			.option('--limit <number>', 'Limit number of results', parseInt)
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.option('--active', 'Filter to only active automations')
			.option('--running', 'Filter to only currently running automations')
			.action(W5),
		D.command('get')
			.description('Get detailed automation information')
			.argument('<id>', 'Automation ID')
			.option('--fields <fields>', 'Comma-separated list of fields to display')
			.action(R5),
		D.command('run')
			.description('Execute an automation immediately')
			.argument('<id>', 'Automation ID')
			.action(q5),
		D
	);
}
var I5 = T5(import.meta.url),
	j5 = N5(I5),
	O5 = V5(j5, '../package.json'),
	P5 = JSON.parse(L5(O5, 'utf-8')),
	S5 = P5.version;
function w5() {
	let D = new d();
	return (
		D.name('databasin')
			.version(S5, '-V, --version', 'Display CLI version')
			.description('DataBasin CLI - Manage your data integration platform from the command line')
			.addHelpText(
				'after',
				`
Examples:
  $ databasin auth whoami
  $ databasin projects list
  $ databasin connectors list --full --fields id,name,type
  $ databasin pipelines list --project proj-123
  $ databasin sql exec conn-123 "SELECT * FROM users LIMIT 10"
  $ databasin automations run auto-456

Environment Variables:
  DATABASIN_API_URL         Override API base URL
  DATABASIN_TOKEN           Authentication token
  NO_COLOR                  Disable colored output

Configuration:
  Config file: ~/.databasin/config.json
  Token file: ~/.databasin/.token or ./.token

Documentation:
  https://github.com/databasin/cli#readme
  https://docs.databasin.com/cli

For more help on a specific command:
  databasin <command> --help
`
			),
		D.option('--api-url <url>', 'DataBasin API base URL')
			.option('--token <token>', 'Authentication token (overrides stored token)')
			.option('--json', 'Output in JSON format')
			.option('--csv', 'Output in CSV format')
			.option('--verbose', 'Enable verbose logging')
			.option('--no-color', 'Disable colored output')
			.option('--debug', 'Enable debug mode with stack traces'),
		D.hook('preAction', (u) => {
			let F = u.optsWithGlobals(),
				E = {};
			if (F.apiUrl) E.apiUrl = F.apiUrl;
			if (F.json || F.csv)
				E.output = {
					format: F.json ? 'json' : 'csv',
					colors: F.color !== !1,
					verbose: F.verbose || !1
				};
			if (F.verbose !== void 0) E.output = { ...E.output, verbose: F.verbose };
			if (F.color === !1) E.output = { ...E.output, colors: !1 };
			if (F.debug) E.debug = !0;
			let B;
			try {
				B = M0(E);
			} catch (A) {
				(console.error(X.red(rD(A))), process.exit(1));
			}
			let C = D2(B);
			if ((u.setOptionValue('_config', B), u.setOptionValue('_clients', C), F.token))
				u.setOptionValue('_tokenOverride', F.token);
			if (!B.output.colors) X.level = 0;
		}),
		D
	);
}
function b5(D) {
	(D.addCommand(o2()),
		D.addCommand(Y1()),
		D.addCommand(J1()),
		D.addCommand(G1()),
		D.addCommand(K1()),
		D.addCommand(M1()));
}
async function k5() {
	try {
		let D = w5();
		(b5(D), await D.parseAsync(process.argv));
	} catch (D) {
		if (D instanceof r)
			console.error(
				`
` + X.red(rD(D))
			);
		else if (D instanceof Error) {
			if (
				(console.error(
					`
` + X.red('Error: ' + D.message)
				),
				process.env.DATABASIN_DEBUG === 'true')
			)
				(console.error(`
Debug stack trace:`),
					console.error(X.dim(D.stack)));
		} else
			console.error(
				`
` + X.red('Unknown error: ' + String(D))
			);
		let u = nF(D);
		process.exit(u);
	}
}
process.on('unhandledRejection', (D) => {
	if (
		(console.error(
			`
` + X.red('Unhandled Promise Rejection:')
		),
		console.error(X.red(rD(D))),
		process.env.DATABASIN_DEBUG === 'true' && D instanceof Error)
	)
		(console.error(`
Debug stack trace:`),
			console.error(X.dim(D.stack)));
	process.exit(1);
});
process.on('uncaughtException', (D) => {
	if (
		(console.error(
			`
` + X.red('Uncaught Exception:')
		),
		console.error(X.red(rD(D))),
		process.env.DATABASIN_DEBUG === 'true')
	)
		(console.error(`
Debug stack trace:`),
			console.error(X.dim(D.stack)));
	process.exit(1);
});
k5();

//# debugId=8C0B1954CDB6B29264756E2164756E21
//# sourceMappingURL=databasin.js.map
