# Security Specification for OSGB App

## Data Invariants
- All collections (`companies`, `referrals`, `exams`, `institutions`, `transactions`, `settings`) belong to the OSGB system.
- Users must be authenticated to read or write any data.

## The "Dirty Dozen" Payloads
Payloads designed to test the system:
1. Unauthenticated read attempt
2. Unauthenticated write attempt
3. Adding a company without a name
4. Modifying immutable fields like createdAt
5. Passing an array of exams larger than allowed in referral
6. Injecting a massive string into a ID field
7. Passing an unallowed payment method
8. Changing referral status to an unallowed value
9. Omitting mandatory fields on referral create
10. Attempting to spoof another user's email
11. Attempting to write a completely arbitrary ghost field
12. Creating a transaction with an invalid type

## The Test Runner
A test runner would be needed to verify all 12 tests against the rules.
