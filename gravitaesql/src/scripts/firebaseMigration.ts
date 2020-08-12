import { PrismaClient, RecordCreateInput } from '@prisma/client'
import moment from 'moment'
import { ulid } from 'ntp-ulid'

import admin from '../firebase'
import { exit } from 'process'

const prisma = new PrismaClient()

let adminsFirebaseId: string[]

const locateAdmins = async (permissions: any) => {
  adminsFirebaseId = Object.keys(permissions)
}

const migrateBugReports = async (bugs: Object) => {
  const promises = Object.values(bugs).map(async bug => {
    let authorConnect = null
    if (bug.email) {
      const author = (await prisma.user.findMany({
        where: {
          records: {
            every: {
              RecordPersonal: {
                every: {
                  email: {
                    equals: bug.email
                  }
                }
              }
            }
          }
        }
      }))[0]
      if (author) {
        authorConnect = {
          connect: {
            vid: author.vid
          }
        }
      }
    }

    return await prisma.bugReport.create({
      data: {
        vid: ulid(),
        author: authorConnect,
        email: bug.email,
        title: bug.title,
        data: JSON.stringify(bug.data),
      }
    })
  })
  await Promise.all(promises)
  console.log("done with bugs")
}

const migrateMessages = async (messages: Object) => {
  const promises = Object.values(messages).map(async message => {
    return await prisma.alert.create({
      data: {
        vid: ulid(),
        author: {
          connect: {
            firebaseId: adminsFirebaseId[Math.floor(Math.random() * adminsFirebaseId.length)]
          }
        },
        message: message.en,
        type: message.type.toUpperCase(),
      }
    })
  })
  await Promise.all(promises)
  console.log("done with alerts")
}

const migrateUsers = async (users: Object) => {
  const promises = Object.entries(users).map(async entry => {
    const firebaseId = entry[0]
    const user = entry[1]

    return await prisma.user.create({
      data: {
        vid: ulid(),
        firebaseId: firebaseId,
        autosave: user.autosave,
        sectionOrder: JSON.stringify(user.cv_order),
        records: {
          create: parseRecords(user.cv),
        }
      }
    })
  })
  await Promise.all(promises)
  console.log("done with users")
}

const parseRecords = (cv: any): RecordCreateInput[] => {
  const records: RecordCreateInput[] = []

  Array.from(parseAcademic(cv.academic))
    .forEach(record => records.push(record));
  Array.from(parseAchievement(cv.achievement))
    .forEach(record => records.push(record));
  Array.from(parseEducation(cv.education))
    .forEach(record => records.push(record));
  Array.from(parseLanguage(cv.language))
    .forEach(record => records.push(record));
  Array.from(parsePersonal(cv.header))
    .forEach(record => records.push(record));
  Array.from(parseProject(cv.project))
    .forEach(record => records.push(record));
  Array.from(parseSkill(cv.skill))
    .forEach(record => records.push(record));
  Array.from(parseWork(cv.work))
    .forEach(record => records.push(record));

  return records
}

const recordBoilerplate = (disable: any): any => ({
  vid: ulid(),
  hidden: disable ?? false,
})

const parseAcademic = (records: any): RecordCreateInput[] => {
  if (!records) {
    return []
  }

  return Array.from<any>(records).map(record => ({
    ...recordBoilerplate(record?.disable),
    RecordAcademic: {
      create: {
        title: record?.name,
        startDate: parseDate(record?.start_date) ?? new Date(),
        endDate: parseDate(record?.end_date),
        description: record?.description,
        articleLink: record?.article_link,
        institution: parseInstitution(record?.institution),
        location: parseLocation(record?.location),
      }
    },
  }))
}

const parseAchievement = (records: any): RecordCreateInput[] => {
  if (!records) {
    return []
  }

  return Array.from<any>(records).map(record => ({
    ...recordBoilerplate(record?.disable),
    RecordAchievement: {
      create: {
        title: record?.name,
        startDate: parseDate(record?.start_date) ?? new Date(),
        endDate: parseDate(record?.end_date),
        description: record?.description,
        position: record?.place,
        certificateLink: record?.certification_link,
        institution: parseInstitution(record?.institution),
        location: parseLocation(record?.location),
      }
    },
  }))
}

const parseEducation = (records: any): RecordCreateInput[] => {
  if (!records) {
    return []
  }

  return Array.from<any>(records).map(record => ({
    ...recordBoilerplate(record?.disable),
    RecordEducation: {
      create: {
        course: record?.course,
        startDate: parseDate(record?.start_date) ?? new Date(),
        endDate: parseDate(record?.end_date),
        description: record?.description,
        teacher: record?.teacher,
        institution: parseInstitution(record?.institution),
        location: parseLocation(record?.location),
      }
    },
  }))
}

const parseLanguage = (records: any): RecordCreateInput[] => {
  if (!records) {
    return []
  }

  return Array.from<any>(records).map(record => ({
    ...recordBoilerplate(record?.disable),
    RecordLanguage: {
      create: {
        name: record?.language,
        level: record?.level,
      }
    },
  }))
}

const parsePersonal = (record: any): RecordCreateInput[] => {
  if (!record) {
    return []
  }

  return [{
    ...recordBoilerplate(record?.disable),
    RecordPersonal: {
      create: {
        name: record?.name,
        email: record?.email,
        homepage: record?.homepage,
        phone: record?.phone,
        address: record?.address,
        linkedin: record?.linkedin,
        github: record?.github,
        birthday: parseDate(record?.birthday),
      }
    },
  }]
}

const parseProject = (records: any): RecordCreateInput[] => {
  if (!records) {
    return []
  }

  return Array.from<any>(records).map(record => ({
    ...recordBoilerplate(record?.disable),
    RecordProject: {
      create: {
        title: record?.name,
        startDate: parseDate(record?.start_date) ?? new Date(),
        endDate: parseDate(record?.end_date),
        description: record?.description,
        programmingLanguage: record?.language,
        repositoryLink: record?.repository_link,
        location: parseLocation(record?.location),
      }
    },
  }))
}

const parseSkill = (records: any): RecordCreateInput[] => {
  if (!records) {
    return []
  }

  return Array.from<any>(records).map(record => ({
    ...recordBoilerplate(record?.disable),
    RecordSkill: {
      create: {
        name: record?.skill_name,
        type: record?.skill_type,
        level: record?.skill_level,
      }
    },
  }))
}

const parseWork = (records: any): RecordCreateInput[] => {
  if (!records) {
    return []
  }

  return Array.from<any>(records).map(record => ({
    ...recordBoilerplate(record?.disable),
    RecordWork: {
      create: {
        role: record?.role,
        startDate: parseDate(record?.start_date) ?? new Date(),
        endDate: parseDate(record?.end_date),
        description: record?.description,
        institution: parseInstitution(record?.institution),
        location: parseLocation(record?.location),
      }
    },
  }))
}

const parseDate = (dateString: any): any => {
  if (!dateString) {
    return null
  }
  return moment.utc(dateString, 'YYYY-MM-DD').toDate()
}

const parseInstitution = (institution: any): any => {
  if (!institution) {
    return null
  }
  return {
    create: {
      vid: ulid(),
      name: institution?.name,
    }
  }
}

const parseLocation = (location: any): any => {
  if (!location) {
    return null
  }
  return {
    create: {
      vid: ulid(),
      country: location?.country,
      governingDistrict: location?.state,
      cityTown: location?.city,
    }
  }
}

const migrate = async () => {
  const ref = admin.database().ref()
  const db = (await ref.once('value')).val()

  await migrateUsers(db['users'])
  await locateAdmins(db['permissions'])
  await migrateBugReports(db['bug'])
  await migrateMessages(db['messages'])

  exit()
}

migrate()
