const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const WWW_REGEX = /www\.[^\s]+/g;
const SHORT_LINK_DOMAINS = ['bit.ly', 't.co', 'goo.gl', 'tinyurl.com', 'ow.ly', 'is.gd', 'buff.ly'];

export function detectUrl(content) {
  if (!content || typeof content !== 'string') {
    return { isUrlPost: false, urls: [] };
  }

  const urls = [];
  
  const httpMatches = content.match(URL_REGEX);
  if (httpMatches) {
    urls.push(...httpMatches);
  }

  const wwwMatches = content.match(WWW_REGEX);
  if (wwwMatches) {
    urls.push(...wwwMatches);
  }

  for (const domain of SHORT_LINK_DOMAINS) {
    const shortLinkRegex = new RegExp(`${domain}/[a-zA-Z0-9]+`, 'g');
    const shortMatches = content.match(shortLinkRegex);
    if (shortMatches) {
      urls.push(...shortMatches);
    }
  }

  return {
    isUrlPost: urls.length > 0,
    urls: [...new Set(urls)]
  };
}

export const TOKEN_COSTS = {
  AI_CAPTION: 1,
  STANDARD_POST: 3,
  URL_POST: 20
};

export function calculateTokenCost(content) {
  const { isUrlPost } = detectUrl(content);
  
  return {
    tokensRequired: isUrlPost ? TOKEN_COSTS.URL_POST : TOKEN_COSTS.STANDARD_POST,
    type: isUrlPost ? 'url' : 'standard'
  };
}
