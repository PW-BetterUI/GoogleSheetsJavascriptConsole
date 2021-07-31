const { google } = require("googleapis");
const { GoogleSpreadsheet } = require('google-spreadsheet');

const creds = require("./client_secrets.json");

const sheetId = '1w7bPa_hrH382oVPDwIW9EotY-rzHcj8VHBesYPHPNEg';

const delay = ms => new Promise(res => setTimeout(res, ms));

const client = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/spreadsheets'] ,
);

client.authorize(function(err, tokens){
    if(err)
    {
        console.log(err);
        return;
    }
    else
    {
        maintask(client);
    }
});

async function maintask(cl)
{
    const googleSheets = google.sheets({ version: 'v4', auth: cl });

    // Creates credentials to get information from the student credentials spreadsheet
    const studentInformationCreds = {
        spreadsheetId: sheetId,
		range: 'Student Information!A1:L',
    }

    let informationLogData = await googleSheets.spreadsheets.values.get(studentInformationCreds);
    let informationDataArray = informationLogData.data.values;

    // Creates credentials to get information from the announcements spreadsheet
    const announcementLogCreds = {
        spreadsheetId: sheetId,
        range: 'Announcement Log!A1:K',
    }

    let announcementLogData = await googleSheets.spreadsheets.values.get(announcementLogCreds);
    let announcementDataArray = announcementLogData.data.values;

    const tagsCol = informationDataArray[0];
    const tagsColPos = tagsCol.indexOf('Tags');

    let i = 0; // Counter for which row is being accessed
    informationDataArray.forEach(row => {
        // Repeats once per student in the database
        if(i > 0)
        {
            let t = informationDataArray[i][tagsColPos].replace(/,/g, '');
            let studentTags = t.split(' ');

            let range = `Student Information!L${i + 1}`

            let newUnreadAnnouncementIds = []; // New announcment ids that have just appeared on the database
            let updatedUnreadAnnouncementIds = [[]]; // Final announcement ids array that will be pushed onto the spreadsheet

            let completed = false;
            // Repeats the process per announcement per student
            announcementDataArray.forEach(announcement => {
                let targetAudience = [announcement[2], announcement[3], announcement[4], announcement[5], announcement[6]];
                let announcementId = announcement[10];
                
                if(studentTags.some(r => targetAudience.includes(r)))
                {
                    let currentUnreadAnnouncementIds = row[11];

                    if(currentUnreadAnnouncementIds != undefined && completed == false)
                    {
                        let v = currentUnreadAnnouncementIds.replace(/,/g, '');
                        let oldUnreadAnnouncementsArr = v.split(' ');

                        updatedUnreadAnnouncementIds[0] = updatedUnreadAnnouncementIds[0].concat(oldUnreadAnnouncementsArr);
                    }

                    updatedUnreadAnnouncementIds[0].push(announcementId);
                    completed = true;
                }
            });

            console.log(updatedUnreadAnnouncementIds);

            let updatedValues = [[updatedUnreadAnnouncementIds.toString()]];

            const updateDoc = {
                spreadsheetId: sheetId,
                range: range,
                valueInputOption: "USER_ENTERED",
                resource: { values: updatedValues },
            }

            let res = googleSheets.spreadsheets.values.update(updateDoc);
        }
        i++;
    });
}