declare module 'fontkit' {
  type PdfLibFontkit = Parameters<
    import('pdf-lib').PDFDocument['registerFontkit']
  >[0];

  const fontkit: PdfLibFontkit;
  export default fontkit;
}
