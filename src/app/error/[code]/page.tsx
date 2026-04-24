import Link from 'next/link';

interface ErrorData {
  meaning: string;
  description: string;
}

const ERROR_DICTIONARY: Record<string, ErrorData> = {
  // 4xx Client Errors
  '400': {
    meaning: 'Bad Request',
    description: 'The server could not understand the request due to invalid syntax.',
  },
  '401': {
    meaning: 'Unauthorized',
    description: 'Authentication is required and has failed or has not yet been provided.',
  },
  '402': {
    meaning: 'Payment Required',
    description: 'Reserved for future use. This request cannot be processed until payment is made.',
  },
  '403': {
    meaning: 'Forbidden',
    description: 'The server understood the request but refuses to authorize it.',
  },
  '404': {
    meaning: 'Not Found',
    description: 'The requested resource could not be found but may be available in the future.',
  },
  '405': {
    meaning: 'Method Not Allowed',
    description: 'A request method is not supported for the requested resource.',
  },
  '406': {
    meaning: 'Not Acceptable',
    description:
      'The requested resource is capable of generating only content not acceptable according to the Accept headers.',
  },
  '407': {
    meaning: 'Proxy Authentication Required',
    description: 'The client must first authenticate itself with the proxy.',
  },
  '408': {
    meaning: 'Request Timeout',
    description: 'The server timed out waiting for the request.',
  },
  '409': {
    meaning: 'Conflict',
    description:
      'Indicates that the request could not be processed because of conflict in the current state of the resource.',
  },
  '410': {
    meaning: 'Gone',
    description:
      'Indicates that the resource requested is no longer available and will not be available again.',
  },
  '411': {
    meaning: 'Length Required',
    description:
      'The request did not specify the length of its content, which is required by the requested resource.',
  },
  '412': {
    meaning: 'Precondition Failed',
    description:
      'The server does not meet one of the preconditions that the requester put on the request.',
  },
  '413': {
    meaning: 'Payload Too Large',
    description: 'The request is larger than the server is willing or able to process.',
  },
  '414': {
    meaning: 'URI Too Long',
    description: 'The URI provided was too long for the server to process.',
  },
  '415': {
    meaning: 'Unsupported Media Type',
    description:
      'The request entity has a media type which the server or resource does not support.',
  },
  '416': {
    meaning: 'Range Not Satisfiable',
    description:
      'The client has asked for a portion of the file, but the server cannot supply that portion.',
  },
  '417': {
    meaning: 'Expectation Failed',
    description: 'The server cannot meet the requirements of the Expect request-header field.',
  },
  '418': {
    meaning: "I'm a Teapot",
    description: 'This server refuses to brew coffee because it is, permanently, a teapot.',
  },
  '421': {
    meaning: 'Misdirected Request',
    description: 'The request was directed at a server that is not able to produce a response.',
  },
  '422': {
    meaning: 'Unprocessable Entity',
    description:
      'The request was well-formed but was unable to be followed due to semantic errors.',
  },
  '423': {
    meaning: 'Locked',
    description: 'The resource that is being accessed is locked.',
  },
  '424': {
    meaning: 'Failed Dependency',
    description:
      'The request failed because it depended on another request and that request failed.',
  },
  '425': {
    meaning: 'Too Early',
    description:
      'Indicates that the server is unwilling to risk processing a request that might be replayed.',
  },
  '426': {
    meaning: 'Upgrade Required',
    description: 'The client should switch to a different protocol.',
  },
  '428': {
    meaning: 'Precondition Required',
    description: 'The origin server requires the request to be conditional.',
  },
  '429': {
    meaning: 'Too Many Requests',
    description: 'The user has sent too many requests in a given amount of time.',
  },
  '431': {
    meaning: 'Request Header Fields Too Large',
    description:
      'The server is unwilling to process the request because either an individual header field, or all the header fields collectively, are too large.',
  },
  '451': {
    meaning: 'Unavailable For Legal Reasons',
    description:
      'A server operator has received a legal demand to deny access to a resource or to a set of resources that includes the requested resource.',
  },

  // 5xx Server Errors
  '500': {
    meaning: 'Internal Server Error',
    description:
      'A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.',
  },
  '501': {
    meaning: 'Not Implemented',
    description:
      'The server either does not recognize the request method, or it lacks the ability to fulfill the request.',
  },
  '502': {
    meaning: 'Bad Gateway',
    description:
      'The server was acting as a gateway or proxy and received an invalid response from the upstream server.',
  },
  '503': {
    meaning: 'Service Unavailable',
    description:
      'The server cannot handle the request (because it is overloaded or down for maintenance).',
  },
  '504': {
    meaning: 'Gateway Timeout',
    description:
      'The server was acting as a gateway or proxy and did not receive a timely response from the upstream server.',
  },
  '505': {
    meaning: 'HTTP Version Not Supported',
    description: 'The server does not support the HTTP protocol version used in the request.',
  },
  '506': {
    meaning: 'Variant Also Negotiates',
    description: 'Transparent content negotiation for the request results in a circular reference.',
  },
  '507': {
    meaning: 'Insufficient Storage',
    description: 'The server is unable to store the representation needed to complete the request.',
  },
  '508': {
    meaning: 'Loop Detected',
    description: 'The server detected an infinite loop while processing the request.',
  },
  '510': {
    meaning: 'Not Extended',
    description: 'Further extensions to the request are required for the server to fulfill it.',
  },
  '511': {
    meaning: 'Network Authentication Required',
    description: 'The client needs to authenticate to gain network access.',
  },

  // Common CDN / Proxy Errors
  '520': {
    meaning: 'Unknown Error',
    description: 'The origin server returned an empty, unknown, or unexpected response to the CDN.',
  },
  '521': {
    meaning: 'Web Server Down',
    description: 'The origin server has refused the connection from the CDN.',
  },
  '522': {
    meaning: 'Connection Timed Out',
    description: 'The CDN could not negotiate a TCP connection with the origin server.',
  },
  '523': {
    meaning: 'Origin Unreachable',
    description: 'The CDN could not reach the origin server.',
  },
  '524': {
    meaning: 'Timeout Occurred',
    description:
      'The CDN was able to complete a TCP connection to the origin server, but did not receive a timely HTTP response.',
  },
  '525': {
    meaning: 'SSL Handshake Failed',
    description: 'The CDN could not negotiate a SSL/TLS handshake with the origin server.',
  },
  '526': {
    meaning: 'Invalid SSL Certificate',
    description:
      'The CDN could not validate the SSL/TLS certificate that the origin server presented.',
  },
  '527': {
    meaning: 'Railgun Error',
    description: 'The request timed out or failed after the WAN connection had been established.',
  },
};

export default function ErrorCodePage({ params }: { params: { code: string } }) {
  const code = params.code;
  const errorData = ERROR_DICTIONARY[code] || {
    meaning: 'Unknown Error',
    description: 'An unexpected and unhandled error has disrupted the signal.',
  };

  // Determine accent color based on code type
  let accentClass = 'text-red-500';
  let gradientClass = 'from-red-400 to-red-600';
  let icon = 'error_outline';

  if (code.startsWith('4')) {
    accentClass = 'text-orange-500';
    gradientClass = 'from-orange-400 to-orange-600';
    icon = 'warning_amber';
  } else if (code.startsWith('52')) {
    accentClass = 'text-purple-500';
    gradientClass = 'from-purple-400 to-purple-600';
    icon = 'cloud_off';
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-32 pb-20 bg-slate-950">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 text-center space-y-8">
        <div className="relative inline-block">
          <div
            className={`text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b ${gradientClass} opacity-20 italic`}
          >
            {code}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`material-icons text-6xl ${accentClass}`}>{icon}</span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter">
            {errorData.meaning}
            <span className={accentClass}>.</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xs mx-auto leading-relaxed font-medium">
            {errorData.description}
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-10 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all active:scale-95"
        >
          <span className="material-icons text-lg">home</span>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
