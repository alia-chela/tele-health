# Telehealth Platform

A decentralized telehealth platform designed to connect patients and healthcare providers, enabling virtual consultations, appointment scheduling, and medical record management. This platform leverages blockchain technology to ensure data security and reliability.

## Features

### 1. **User Management**
   - **Departments**: Manage medical departments within the platform.
   - **Doctors**: Add and manage doctor profiles, assign departments, and track availability.
   - **Patients**: Register patients with comprehensive details including contact information, emergency contacts, allergies, and medical history.

### 2. **Consultations**
   - Schedule consultations between doctors and patients.
   - Maintain a record of consultation details for future reference.

### 3. **Messaging and Chat**
   - Real-time messaging between patients and doctors.
   - Store chat history for ongoing consultations.

### 4. **Appointment Scheduling**
   - Patients can book appointments with doctors.
   - Appointments include details such as reason, date, time, and status (scheduled, canceled, completed).

### 5. **Video Conferencing Integration**
   - Support for virtual consultations with video links included in the appointment details.

### 6. **Prescription Management**
   - Doctors can issue prescriptions with detailed instructions.
   - Prescriptions include a list of medications and dosage instructions.

### 7. **Billing and Payment Processing**
   - Secure payment options for consultations and treatments.
   - Tracks payment status and methods.

### 8. **Medical Records and History Tracking**
   - Store and access comprehensive medical records, including consultation notes, prescriptions, lab results, and immunizations.

### 9. **Health Calculations**
   - **BMI Calculation**: Calculates Body Mass Index (BMI) based on patient weight and height, categorizing the results.
   - **Medication Dosage Calculation**: Determines medication dosage based on weight.
   - **Insurance Cost Estimation**: Provides cost estimates based on insurance coverage.
   - **Health Risk Score**: Calculates a health risk score using factors like age, BMI, and blood pressure.

## Data Structures

### Core Records
- **Department**: Information about each medical department.
- **Doctor**: Profiles of healthcare providers, including specialization and department affiliation.
- **Patient**: Comprehensive patient information, including medical history.
- **Consultation**: Details of medical consultations.
- **Chat**: Messages exchanged during consultations.
- **Appointment**: Scheduled appointments with optional video conferencing links.
- **Prescription**: Details of prescribed medications and instructions.
- **Payment**: Payment records for consultations.
- **Medical Record**: Consolidated records of a patient’s medical history, including consultation notes and lab results.

### Payload Structures
Each entity has associated payload structures for creation and updates, such as:
- `CreateDoctorPayload`
- `CreatePatientPayload`
- `CreateConsultationPayload`
- `CreateChatPayload`
- `CreateAppointmentPayload`
- `CreatePrescriptionPayload`
- `CreatePaymentPayload`

## Usage

### Installation
1. Clone the repository.
2. Install the required dependencies.
3. Start the backend service.

### API Endpoints
The platform provides several endpoints for interacting with the system:

#### Patient Management
- **Create Patient**: Registers a new patient with detailed information.
- **Get Patient by ID**: Fetches a patient's details by ID.
- **Update Patient Profile**: Updates existing patient details.
- **Delete Patient Profile**: Deletes a patient record.

#### Doctor Management
- **Create Doctor**: Registers a new doctor.
- **Get Doctor by ID**: Fetches a doctor’s details by ID.
- **Update Doctor Profile**: Updates a doctor’s profile.
- **Delete Doctor Profile**: Deletes a doctor record.

#### Appointment and Consultation
- **Create Appointment**: Books an appointment for a patient with a doctor.
- **Update Appointment with Video Link**: Adds a video link to an appointment.
- **Create Consultation**: Schedules a consultation.
- **Get Consultation by ID**: Retrieves consultation details by ID.
- **Get Consultation History by Patient**: Lists all consultations for a specific patient.

#### Health Calculations
- **Calculate BMI**: Calculates BMI based on patient weight and height.
- **Calculate Dosage**: Computes medication dosage based on patient weight.
- **Estimate Insurance Cost**: Estimates the cost of treatment with/without insurance.
- **Calculate Health Risk Score**: Evaluates a health risk score based on various factors.



## Things to be explained in the course:
1. What is Ledger? More details here: https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/
2. What is Internet Identity? More details here: https://internetcomputer.org/internet-identity
3. What is Principal, Identity, Address? https://internetcomputer.org/internet-identity | https://yumimarketplace.medium.com/whats-the-difference-between-principal-id-and-account-id-3c908afdc1f9
4. Canister-to-canister communication and how multi-canister development is done? https://medium.com/icp-league/explore-backend-multi-canister-development-on-ic-680064b06320

## How to deploy canisters implemented in the course

### Ledger canister
`./deploy-local-ledger.sh` - deploys a local Ledger canister. IC works differently when run locally so there is no default network token available and you have to deploy it yourself. Remember that it's not a token like ERC-20 in Ethereum, it's a native token for ICP, just deployed separately.
This canister is described in the `dfx.json`:
```
	"ledger_canister": {
  	"type": "custom",
  	"candid": "https://raw.githubusercontent.com/dfinity/ic/928caf66c35627efe407006230beee60ad38f090/rs/rosetta-api/icp_ledger/ledger.did",
  	"wasm": "https://download.dfinity.systems/ic/928caf66c35627efe407006230beee60ad38f090/canisters/ledger-canister.wasm.gz",
  	"remote": {
    	"id": {
      	"ic": "ryjl3-tyaaa-aaaaa-aaaba-cai"
    	}
  	}
	}
```
`remote.id.ic` - that is the principal of the Ledger canister and it will be available by this principal when you work with the ledger.

Also, in the scope of this script, a minter identity is created which can be used for minting tokens
for the testing purposes.
Additionally, the default identity is pre-populated with 1000_000_000_000 e8s which is equal to 10_000 * 10**8 ICP.
The decimals value for ICP is 10**8.

List identities:
`dfx identity list`

Switch to the minter identity:
`dfx identity use minter`

Transfer ICP:
`dfx ledger transfer <ADDRESS>  --memo 0 --icp 100 --fee 0`
where:
 - `--memo` is some correlation id that can be set to identify some particular transactions (we use that in the marketplace canister).
 - `--icp` is the transfer amount
 - `--fee` is the transaction fee. In this case it's 0 because we make this transfer as the minter idenity thus this transaction is of type MINT, not TRANSFER.
 - `<ADDRESS>` is the address of the recipient. To get the address from the principal, you can use the helper function from the marketplace canister - `getAddressFromPrincipal(principal: Principal)`, it can be called via the Candid UI.


### Internet identity canister

`dfx deploy internet_identity` - that is the canister that handles the authentication flow. Once it's deployed, the `js-agent` library will be talking to it to register identities. There is UI that acts as a wallet where you can select existing identities
or create a new one.

