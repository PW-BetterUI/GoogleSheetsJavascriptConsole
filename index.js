const { google, searchconsole_v1 } = require("googleapis");
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

function authorizeAccess()
{
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
}

async function maintask(cl)
{
    const googleSheets = google.sheets({ version: 'v4', auth: cl });

    // Creates credentials to get information from the student credentials spreadsheet
    const studentInformationCreds = {
        spreadsheetId: sheetId,
		range: 'Student Information!A1:N',
    }

    let informationLogData = await googleSheets.spreadsheets.values.get(studentInformationCreds);
    let informationDataArray = informationLogData.data.values;

    // Creates credentials to get information from the announcements spreadsheet
    const announcementLogCreds = {
        spreadsheetId: sheetId,
        range: 'Announcement Log!A1:L',
    }

    let announcementLogData = await googleSheets.spreadsheets.values.get(announcementLogCreds);
    let announcementDataArray = announcementLogData.data.values;

    const tagsCol = informationDataArray[0];
    const tagsColPos = tagsCol.indexOf('Tags');

    const unreadAnncementIdsCol = informationDataArray[0];
    const unreadAnncementIdsColPos = unreadAnncementIdsCol.indexOf('UnreadAnnouncements');

    const readAnncementIdsCol = informationDataArray[0];
    const readAnncementIdsColPos = readAnncementIdsCol.indexOf('ReadAnnouncements');

    const anncementIdCol = announcementDataArray[0];
    const anncementIdColPos = anncementIdCol.indexOf('Id');

    let i = 0; // Counter for which row is being accessed
    informationDataArray.forEach(row => {
        // Repeats once per student in the database
        if(i > 0)
        {
            let t = informationDataArray[i][tagsColPos].replace(/,/g, '');
            let studentTags = t.split(' ');

            let assignedAnnouncementRange = `Student Information!N${i + 1}`;

            // let newUnreadAnnouncementIds = []; // New announcment ids that have just appeared on the database
            let updatedAssignedAnnouncementIds = [[]]; // Final assigned announcement ids array that will be pushed onto the spreadsheet

            // Repeats the process per announcement per student
            announcementDataArray.forEach(announcement => {
                let targetAudience = [announcement[2], announcement[3], announcement[4], announcement[5], announcement[6]];
                let announcementId = announcement[anncementIdColPos];
                
                if(studentTags.some(r => targetAudience.includes(r)))
                {
                    updatedAssignedAnnouncementIds[0].push(announcementId);
                }
            });

            let unreadAnnouncementIdsRange = `Student Information!L${i + 1}`;
            let unreadAnnouncementIds = [updatedAssignedAnnouncementIds[0]];
            
            // Filter out announcements that have already been read
            let readAnnouncementIds = ((informationDataArray[i][readAnncementIdsColPos]).replace(/,/g, ' ')).split(' ');
            unreadAnnouncementIds[0] = updatedAssignedAnnouncementIds[0].filter(v => !readAnnouncementIds.includes(v));

            // Arranges announcement ids by numberical order
            updatedAssignedAnnouncementIds[0] = updatedAssignedAnnouncementIds[0].sort((a, b) => a - b);
            unreadAnnouncementIds[0] = unreadAnnouncementIds[0].sort((a,b) => a - b);

            // Converts the array to a string so that all the IDs can be placed into one cell in the spreadsheet
            let updatedAssignedAnnouncemetValues = [[updatedAssignedAnnouncementIds.toString()]];
            let updatedUnreadAnnouncementValues = [[unreadAnnouncementIds.toString()]];

            // Removes the extra comma at the start of the announcements ids
            if(updatedAssignedAnnouncemetValues.toString().startsWith(","))
            {
                updatedAssignedAnnouncemetValues = updatedAssignedAnnouncemetValues.replace(',', '');
            }

            if(updatedUnreadAnnouncementValues.toString().startsWith(","))
            {
                updatedUnreadAnnouncementValues = updatedUnreadAnnouncementValues.replace(',', '');
	    }
		
	    if(updatedUnreadAnnouncementValues.toString() == null || updatedUnreadAnnouncementValues.toString() == '')
            {
                updatedUnreadAnnouncementValues[0] = ["0"];
            }

            const updateAssignedAnnouncements = {
                spreadsheetId: sheetId,
                range: assignedAnnouncementRange,
                valueInputOption: "USER_ENTERED",
                resource: { values: updatedAssignedAnnouncemetValues },
            }

            const updateUnreadAnnouncements = {
                spreadsheetId: sheetId,
                range: unreadAnnouncementIdsRange,
                valueInputOption: "USER_ENTERED",
                resource: { values: updatedUnreadAnnouncementValues },
            }

            let assignedRes = googleSheets.spreadsheets.values.update(updateAssignedAnnouncements);
            let unreadRes = googleSheets.spreadsheets.values.update(updateUnreadAnnouncements);
        }
        i++;
    });
}

setInterval(authorizeAccess, 600000);
