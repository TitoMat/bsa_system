import { validateHeaderValue } from 'node:http';
import { contentDisposition } from './content-disposition';

describe('contentDisposition', () => {
  it('provides an ASCII fallback and UTF-8 filename for Unicode names', () => {
    const header = contentDisposition('O’Brien 客户.pdf');
    expect(() =>
      validateHeaderValue('Content-Disposition', header),
    ).not.toThrow();
    expect(header).toBe(
      `attachment; filename="O_Brien __.pdf"; filename*=UTF-8''O%E2%80%99Brien%20%E5%AE%A2%E6%88%B7.pdf`,
    );
  });

  it('removes header control characters and unsafe fallback quotes', () => {
    expect(contentDisposition('report\r\n"final".pdf')).toBe(
      `attachment; filename="report _final_.pdf"; filename*=UTF-8''report%20%22final%22.pdf`,
    );
  });

  it('supports inline responses', () => {
    expect(contentDisposition('José.pdf', 'inline')).toBe(
      `inline; filename="Jose.pdf"; filename*=UTF-8''Jos%C3%A9.pdf`,
    );
  });
});
