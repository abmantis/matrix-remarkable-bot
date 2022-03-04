import * as puppeteer from 'puppeteer';

const LOGCTXT = "converters";

export async function convertUrlToPdf(url: string) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {
        waitUntil: 'networkidle2',
    });
    const buffer = await page.pdf({
        width: "210mm",
        height: "280mm",
        printBackground: true,
        margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "2cm" }
    });
    await browser.close();
    return buffer;
}