const path = require('path');

function urlNormalize(url) {
  try {
    const parsedUrl = new URL(url);
    const urlOriginal = url;

    parsedUrl.hash = ''; // Remove fragment
    if (parsedUrl.search === '?') {
      parsedUrl.search = ''; // Remove trailing ?
    }

    const urlNormalized = parsedUrl.toString();
    const extOriginal = path.extname(parsedUrl.pathname) || '';
    const extNormalized = extOriginal.toLowerCase(); // Normalize to lowercase

    return {
      urlOriginal,
      urlNormalized,
      extOriginal,
      extNormalized,
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

module.exports = urlNormalize;
