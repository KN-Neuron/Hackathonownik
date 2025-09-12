import Home from '$lib/components/icons/Home.svelte';
import Info from '$lib/components/icons/Info.svelte';
import Ranking from '$lib/components/icons/Ranking.svelte';
import Stats from '$lib/components/icons/Stats.svelte';
import Upload from '$lib/components/icons/Upload.svelte';

type ComponentMap = {
	[key: string]: typeof Home | typeof Info | typeof Stats;
};

export enum IconNames {
	Home = 'home',
	Info = 'info',
	Stats = 'stats',
	Ranking = 'ranking',
	Upload = 'upload'
}

export const componentMap: ComponentMap = {
	[IconNames.Home]: Home,
	[IconNames.Info]: Info,
	[IconNames.Stats]: Stats,
	[IconNames.Ranking]: Ranking,
	[IconNames.Upload]: Upload
};

export function getComponent(componentName: string) {
	const Component = componentMap[componentName];
	if (!Component) {
		throw new Error(`Component "${componentName}" not found.`);
	}
	return Component;
}

export enum HttpStatusCode {
	Continue = 100,
	SwitchingProtocols = 101,
	Processing = 102,
	EarlyHints = 103,

	OK = 200,
	Created = 201,
	Accepted = 202,
	NonAuthoritativeInformation = 203,
	NoContent = 204,
	ResetContent = 205,
	PartialContent = 206,
	MultiStatus = 207,
	AlreadyReported = 208,
	IMUsed = 226,

	MultipleChoices = 300,
	MovedPermanently = 301,
	Found = 302,
	SeeOther = 303,
	NotModified = 304,
	UseProxy = 305,
	TemporaryRedirect = 307,
	PermanentRedirect = 308,

	BadRequest = 400,
	Unauthorized = 401,
	PaymentRequired = 402,
	Forbidden = 403,
	NotFound = 404,
	MethodNotAllowed = 405,
	NotAcceptable = 406,
	ProxyAuthenticationRequired = 407,
	RequestTimeout = 408,
	Conflict = 409,
	Gone = 410,
	LengthRequired = 411,
	PreconditionFailed = 412,
	PayloadTooLarge = 413,
	URITooLong = 414,
	UnsupportedMediaType = 415,
	RangeNotSatisfiable = 416,
	ExpectationFailed = 417,
	ImATeapot = 418,
	MisdirectedRequest = 421,
	UnprocessableEntity = 422,
	Locked = 423,
	FailedDependency = 424,
	TooEarly = 425,
	UpgradeRequired = 426,
	PreconditionRequired = 428,
	TooManyRequests = 429,
	RequestHeaderFieldsTooLarge = 431,
	UnavailableForLegalReasons = 451,

	InternalServerError = 500,
	NotImplemented = 501,
	BadGateway = 502,
	ServiceUnavailable = 503,
	GatewayTimeout = 504,
	HTTPVersionNotSupported = 505,
	VariantAlsoNegotiates = 506,
	InsufficientStorage = 507,
	LoopDetected = 508,
	NotExtended = 510,
	NetworkAuthenticationRequired = 511
}

export enum Role {
	Admin = 'admin',
	Jury = 'jury',
	Participant = 'participant'
}
