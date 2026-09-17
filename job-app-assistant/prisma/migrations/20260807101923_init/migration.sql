-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "summary" TEXT,
    "workExperience" JSONB NOT NULL,
    "education" JSONB NOT NULL,
    "skills" TEXT[],
    "rawResumeText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobDescription" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "rawText" TEXT NOT NULL,
    "requirements" TEXT[],
    "responsibilities" TEXT[],
    "keywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedResume" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "jobDescriptionId" TEXT NOT NULL,
    "tailoredContent" JSONB NOT NULL,
    "gapNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedResume_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "JobDescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
