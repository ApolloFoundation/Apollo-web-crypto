import 'isomorphic-fetch';

export const GET = 'GET';
export const POST = 'POST';

export const handleFetch = async (url: string, method: string, value: any = null, isJson: boolean = false) => {
  let queryPath: string = (process.env.APL_SERVER || process.env.REACT_APP_APL_SERVER || '/') + url;
  const contentType = isJson ? 'application/json' : 'application/x-www-form-urlencoded;charset=UTF-8';
  const options: any = {
    method,
    headers: {
      'Content-Type': contentType,
    },
  };
  if (value) {
    if (method === GET) {
      queryPath = `?${Object.keys(value)
        .map((key) => `${key}=${value[key]}`)
        .join('&')}`;
    } else if (!isJson){
      options.body = Object.keys(value)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(value[key])}`)
        .join('&');
    } else {
      options.body = JSON.stringify(value);
    }
  }
  return fetch(queryPath, options).then((res: any) => res.json());
};
