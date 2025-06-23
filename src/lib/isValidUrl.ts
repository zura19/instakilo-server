function isValidURL(text: string) {
  const regex = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
  return regex.test(text);
}

export default isValidURL;
