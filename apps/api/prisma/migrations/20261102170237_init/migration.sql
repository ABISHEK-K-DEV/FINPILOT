-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'AI_PROCESSING', 'DOCUMENT_PROCESSING', 'EMAIL_REMINDERS', 'PRODUCT_ANALYTICS', 'MARKETING_EMAIL');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK_ACCOUNT', 'CREDIT_CARD', 'UPI', 'DIGITAL_WALLET', 'LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'RECEIPT_SCAN', 'IMPORT', 'SAMPLE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'DEBIT_CARD', 'CREDIT_CARD', 'NET_BANKING', 'WALLET', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SHOPPING_RECEIPT', 'ELECTRICITY_BILL', 'INTERNET_BILL', 'MOBILE_BILL', 'INSURANCE_DOCUMENT', 'SUBSCRIPTION_INVOICE', 'PURCHASE_INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'NEEDS_REVIEW', 'CONFIRMED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('ELECTRICITY', 'INTERNET', 'MOBILE', 'INSURANCE', 'WATER', 'GAS', 'SUBSCRIPTION', 'PURCHASE', 'OTHER');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UNPAID', 'PAID', 'OVERDUE', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringKind" AS ENUM ('BILL', 'SUBSCRIPTION', 'EMI', 'INSURANCE', 'RENT', 'OTHER');

-- CreateEnum
CREATE TYPE "DetectionSource" AS ENUM ('MANUAL', 'RULE_DETECTED', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'ENDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarrantyType" AS ENUM ('MANUFACTURER', 'SELLER', 'EXTENDED', 'OTHER');

-- CreateEnum
CREATE TYPE "ReminderEntityType" AS ENUM ('BILL', 'SUBSCRIPTION', 'RECURRING_PAYMENT', 'WARRANTY', 'EMI', 'BUDGET', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('SPENDING_SPIKE', 'DUPLICATE_TRANSACTION', 'UNEXPECTED_RECURRING_CHARGE', 'BILL_INCREASE', 'SUBSCRIPTION_PRICE_INCREASE', 'POSSIBLE_BILLING_ERROR', 'BUDGET_WARNING', 'CATEGORY_TREND', 'SAVINGS_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('NEW', 'SEEN', 'DISMISSED', 'CONFIRMED_ISSUE', 'NOT_AN_ISSUE');

-- CreateEnum
CREATE TYPE "InsightOrigin" AS ENUM ('RULE', 'RULE_WITH_AI_EXPLANATION');

-- CreateEnum
CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PREMIUM', 'BUSINESS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "planCode" "PlanCode" NOT NULL DEFAULT 'FREE',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "userId" UUID NOT NULL,
    "baseCurrency" CHAR(3) NOT NULL DEFAULT 'INR',
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en-IN',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    "budgetWarningPercent" SMALLINT NOT NULL DEFAULT 80,
    "weekStartsOn" SMALLINT NOT NULL DEFAULT 1,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "userAgent" VARCHAR(255),
    "ipHash" CHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" VARCHAR(32),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "institutionName" VARCHAR(120),
    "maskedIdentifier" VARCHAR(8),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "slug" VARCHAR(48) NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "icon" VARCHAR(32) NOT NULL DEFAULT 'circle',
    "color" CHAR(7) NOT NULL DEFAULT '#64748B',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" UUID,
    "categoryId" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "transactionDate" DATE NOT NULL,
    "merchant" VARCHAR(120),
    "description" VARCHAR(500),
    "notesEnc" TEXT,
    "paymentMethod" "PaymentMethod",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "receiptId" UUID,
    "recurringPaymentId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID,
    "scopeKey" VARCHAR(40) NOT NULL,
    "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "alertThresholdPercent" SMALLINT NOT NULL DEFAULT 80,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "ReceiptStatus" NOT NULL DEFAULT 'UPLOADED',
    "storageKey" VARCHAR(255) NOT NULL,
    "originalFilenameEnc" TEXT,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "ocrProvider" VARCHAR(40),
    "extractionModel" VARCHAR(80),
    "extractedData" JSONB,
    "extractionConfidence" DECIMAL(5,4),
    "failureReason" VARCHAR(255),
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "receiptId" UUID,
    "transactionId" UUID,
    "recurringPaymentId" UUID,
    "billerName" VARCHAR(120) NOT NULL,
    "billType" "BillType" NOT NULL,
    "accountReference" VARCHAR(40),
    "billNumber" VARCHAR(80),
    "issueDate" DATE,
    "dueDate" DATE,
    "periodStart" DATE,
    "periodEnd" DATE,
    "subtotal" DECIMAL(19,4),
    "taxAmount" DECIMAL(19,4),
    "feesAmount" DECIMAL(19,4),
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "usageQuantity" DECIMAL(14,3),
    "usageUnit" VARCHAR(16),
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" "PaymentMethod",
    "paidOn" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_line_items" (
    "id" UUID NOT NULL,
    "billId" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(14,3),
    "unitPrice" DECIMAL(19,4),
    "amount" DECIMAL(19,4) NOT NULL,
    "taxRate" DECIMAL(6,3),
    "taxAmount" DECIMAL(19,4),
    "sortOrder" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "bill_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_payments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "merchant" VARCHAR(120),
    "kind" "RecurringKind" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "intervalCount" SMALLINT NOT NULL DEFAULT 1,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextDueDate" DATE,
    "lastPaidDate" DATE,
    "userReportedAutopay" BOOLEAN NOT NULL DEFAULT false,
    "detectionSource" "DetectionSource" NOT NULL DEFAULT 'MANUAL',
    "detectionConfidence" DECIMAL(5,4),
    "status" "RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recurring_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "recurringPaymentId" UUID,
    "categoryId" UUID,
    "serviceName" VARCHAR(120) NOT NULL,
    "providerKey" VARCHAR(64),
    "planName" VARCHAR(120),
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "billingCycle" "RecurrenceFrequency" NOT NULL,
    "startedOn" DATE,
    "nextRenewalDate" DATE,
    "trialEndsOn" DATE,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancellationUrl" VARCHAR(500),
    "cancellationGuidance" TEXT,
    "cancelledOn" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_price_changes" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "previousAmount" DECIMAL(19,4) NOT NULL,
    "newAmount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "effectiveOn" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_price_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchased_products" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "receiptId" UUID,
    "transactionId" UUID,
    "name" VARCHAR(160) NOT NULL,
    "brand" VARCHAR(80),
    "model" VARCHAR(80),
    "productCategory" VARCHAR(40) NOT NULL DEFAULT 'other',
    "serialNumberEnc" TEXT,
    "purchaseDate" DATE NOT NULL,
    "purchasePrice" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "sellerName" VARCHAR(120),
    "sellerContact" VARCHAR(160),
    "invoiceReference" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "purchased_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranties" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "documentReceiptId" UUID,
    "type" "WarrantyType" NOT NULL DEFAULT 'MANUFACTURER',
    "provider" VARCHAR(120),
    "startDate" DATE NOT NULL,
    "durationMonths" SMALLINT NOT NULL,
    "expiryDate" DATE NOT NULL,
    "terms" TEXT,
    "claimContact" VARCHAR(160),
    "serviceIntervalMonths" SMALLINT,
    "nextServiceDate" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reminders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "entityType" "ReminderEntityType" NOT NULL,
    "billId" UUID,
    "subscriptionId" UUID,
    "recurringPaymentId" UUID,
    "warrantyId" UUID,
    "title" VARCHAR(160) NOT NULL,
    "note" VARCHAR(500),
    "amount" DECIMAL(19,4),
    "currency" CHAR(3),
    "dueDate" DATE NOT NULL,
    "remindAt" TIMESTAMPTZ(3) NOT NULL,
    "channels" "NotificationChannel"[] DEFAULT ARRAY['IN_APP']::"NotificationChannel"[],
    "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_insights" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "InsightType" NOT NULL,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'INFO',
    "status" "InsightStatus" NOT NULL DEFAULT 'NEW',
    "origin" "InsightOrigin" NOT NULL DEFAULT 'RULE',
    "ruleId" VARCHAR(64) NOT NULL,
    "ruleVersion" INTEGER NOT NULL DEFAULT 1,
    "title" VARCHAR(160) NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "dedupeKey" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "financial_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reminderId" UUID,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "data" JSONB,
    "sentAt" TIMESTAMPTZ(3),
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(160),
    "provider" VARCHAR(40) NOT NULL,
    "model" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "contentEnc" TEXT NOT NULL,
    "citations" JSONB,
    "calculation" JSONB,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "actorId" UUID,
    "action" VARCHAR(64) NOT NULL,
    "entityType" VARCHAR(40),
    "entityId" UUID,
    "ipHash" CHAR(64),
    "userAgent" VARCHAR(255),
    "requestId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "code" "PlanCode" NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "priceMonthly" DECIMAL(19,4) NOT NULL,
    "priceYearly" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "features" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" SMALLINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_planCode_idx" ON "users"("planCode");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_expiresAt_idx" ON "sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "consent_records_userId_type_createdAt_idx" ON "consent_records"("userId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "financial_accounts_userId_idx" ON "financial_accounts"("userId");

-- CreateIndex
CREATE INDEX "expense_categories_userId_kind_idx" ON "expense_categories"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_userId_slug_key" ON "expense_categories"("userId", "slug");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_idx" ON "transactions"("userId", "transactionDate" DESC);

-- CreateIndex
CREATE INDEX "transactions_userId_categoryId_transactionDate_idx" ON "transactions"("userId", "categoryId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_type_transactionDate_idx" ON "transactions"("userId", "type", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_userId_isSample_idx" ON "transactions"("userId", "isSample");

-- CreateIndex
CREATE INDEX "transactions_userId_merchant_idx" ON "transactions"("userId", "merchant");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_scopeKey_period_key" ON "budgets"("userId", "scopeKey", "period");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_storageKey_key" ON "receipts"("storageKey");

-- CreateIndex
CREATE INDEX "receipts_userId_createdAt_idx" ON "receipts"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "receipts_userId_sha256_idx" ON "receipts"("userId", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "bills_receiptId_key" ON "bills"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "bills_transactionId_key" ON "bills"("transactionId");

-- CreateIndex
CREATE INDEX "bills_userId_dueDate_idx" ON "bills"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "bills_userId_billType_issueDate_idx" ON "bills"("userId", "billType", "issueDate");

-- CreateIndex
CREATE INDEX "bill_line_items_billId_sortOrder_idx" ON "bill_line_items"("billId", "sortOrder");

-- CreateIndex
CREATE INDEX "recurring_payments_userId_status_nextDueDate_idx" ON "recurring_payments"("userId", "status", "nextDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_recurringPaymentId_key" ON "subscriptions"("recurringPaymentId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_status_nextRenewalDate_idx" ON "subscriptions"("userId", "status", "nextRenewalDate");

-- CreateIndex
CREATE INDEX "subscription_price_changes_subscriptionId_effectiveOn_idx" ON "subscription_price_changes"("subscriptionId", "effectiveOn");

-- CreateIndex
CREATE INDEX "purchased_products_userId_purchaseDate_idx" ON "purchased_products"("userId", "purchaseDate");

-- CreateIndex
CREATE INDEX "warranties_userId_expiryDate_idx" ON "warranties"("userId", "expiryDate");

-- CreateIndex
CREATE INDEX "payment_reminders_status_remindAt_idx" ON "payment_reminders"("status", "remindAt");

-- CreateIndex
CREATE INDEX "payment_reminders_userId_dueDate_idx" ON "payment_reminders"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "financial_insights_userId_status_createdAt_idx" ON "financial_insights"("userId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "financial_insights_userId_dedupeKey_key" ON "financial_insights"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_status_channel_idx" ON "notifications"("status", "channel");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_updatedAt_idx" ON "ai_conversations"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ai_messages_conversationId_createdAt_idx" ON "ai_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "subscription_plans"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurringPaymentId_fkey" FOREIGN KEY ("recurringPaymentId") REFERENCES "recurring_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_recurringPaymentId_fkey" FOREIGN KEY ("recurringPaymentId") REFERENCES "recurring_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_recurringPaymentId_fkey" FOREIGN KEY ("recurringPaymentId") REFERENCES "recurring_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_price_changes" ADD CONSTRAINT "subscription_price_changes_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchased_products" ADD CONSTRAINT "purchased_products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchased_products" ADD CONSTRAINT "purchased_products_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_productId_fkey" FOREIGN KEY ("productId") REFERENCES "purchased_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_documentReceiptId_fkey" FOREIGN KEY ("documentReceiptId") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_recurringPaymentId_fkey" FOREIGN KEY ("recurringPaymentId") REFERENCES "recurring_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "warranties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_insights" ADD CONSTRAINT "financial_insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "payment_reminders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────── Additional integrity constraints (not expressible in Prisma schema) ─────────────

-- Monetary amounts must be positive; direction is expressed by type, never by sign.
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "bills" ADD CONSTRAINT "bills_total_non_negative" CHECK ("totalAmount" >= 0);
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "purchased_products" ADD CONSTRAINT "products_price_non_negative" CHECK ("purchasePrice" >= 0);
ALTER TABLE "subscription_plans" ADD CONSTRAINT "plans_price_non_negative" CHECK ("priceMonthly" >= 0 AND "priceYearly" >= 0);

-- ISO-4217 currency codes.
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "financial_accounts" ADD CONSTRAINT "accounts_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "user_preferences" ADD CONSTRAINT "prefs_currency_iso" CHECK ("baseCurrency" ~ '^[A-Z]{3}$');
ALTER TABLE "bills" ADD CONSTRAINT "bills_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_currency_iso" CHECK ("currency" ~ '^[A-Z]{3}$');

-- Percentages and small ranges.
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_threshold_range" CHECK ("alertThresholdPercent" BETWEEN 1 AND 100);
ALTER TABLE "user_preferences" ADD CONSTRAINT "prefs_threshold_range" CHECK ("budgetWarningPercent" BETWEEN 1 AND 100);
ALTER TABLE "user_preferences" ADD CONSTRAINT "prefs_week_start_range" CHECK ("weekStartsOn" BETWEEN 0 AND 6);
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_duration_positive" CHECK ("durationMonths" > 0 AND "expiryDate" >= "startDate");
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_interval_positive" CHECK ("intervalCount" > 0);

-- Category scoping: system categories have no owner; custom categories always have one.
ALTER TABLE "expense_categories" ADD CONSTRAINT "categories_system_owner" CHECK (("isSystem" AND "userId" IS NULL) OR (NOT "isSystem" AND "userId" IS NOT NULL));
-- System category slugs are globally unique (the composite unique index treats NULL userId as distinct).
CREATE UNIQUE INDEX "expense_categories_system_slug_key" ON "expense_categories" ("slug") WHERE "userId" IS NULL;

-- Masked identifiers must never hold a full account/card number.
ALTER TABLE "financial_accounts" ADD CONSTRAINT "accounts_masked_identifier_short" CHECK ("maskedIdentifier" IS NULL OR length("maskedIdentifier") <= 4);
