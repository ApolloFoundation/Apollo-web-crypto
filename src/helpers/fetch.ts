import 'isomorphic-fetch';

export const GET = 'GET';
export const POST = 'POST';

export const handleFetch = async (url: string, method: string, value?: any) => {
  let queryPath: string = `${process.env.APL_SERVER || 'http://localhost:7876'}${url}`;
  const options: any = {
    method,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
  };
  if (value) {
    if (method === GET) {
      queryPath = `?${Object.keys(value)
        .map((key) => `${key}=${value[key]}`)
        .join('&')}`;
    } else {
      options.body = Object.keys(value)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(value[key])}`)
        .join('&');
    }
  }
  return fetch(queryPath, options).then((res: any) => res.json());
};
