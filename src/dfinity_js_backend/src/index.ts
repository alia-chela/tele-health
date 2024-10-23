import { verify } from "@dfinity/agent";
import { auto } from "@popperjs/core";
import {
  query,
  update,
  text,
  Null,
  Record,
  StableBTreeMap,
  Variant,
  Vec,
  None,
  Some,
  Ok,
  Err,
  ic,
  Principal,
  Opt,
  nat64,
  Duration,
  Result,
  bool,
  Canister,
} from "azle";
import {
  Address,
  Ledger,
  binaryAddressFromAddress,
  binaryAddressFromPrincipal,
  hexAddressFromPrincipal,
} from "azle/canisters/ledger";
import { v4 as uuidv4 } from "uuid";

const Department = Record({
  id: text,
  name: text,
  description: text,
});

const Doctor = Record({
  id: text,
  owner: Principal,
  name: text,
  department_id: text,
  image: text,
});

const Patient = Record({
  id: text,
  owner: Principal,
  name: text,
  age: nat64,
  gender: text,
  phone_number: text,
  email: text,
  address: text,
  emergency_contact: Record({
    name: text,
    phone_number: text,
    relationship: text, // "Parent", "Spouse"
  }),
  allergies: Vec(text), // List of allergies (e.g., ["Peanuts", "Penicillin"])
  current_medications: Vec(text), // List of current medications
  medical_history: Vec(text), // List of past medical conditions or surgeries
});

const Consultation = Record({
  id: text,
  patient_id: text,
  problem: text,
  department_id: text,
});

const Chat = Record({
  id: text,
  patient_id: text,
  doctor_id: text,
  message: text,
  timestamp: text,
});

const Appointment = Record({
  id: text,
  patient_id: text,
  doctor_id: text,
  reason: text,
  appointment_time: text,
  status: text, // "scheduled", "canceled", "completed"
  video_link: Opt(text), // Optional link for video conferencing
});

const Prescription = Record({
  id: text,
  patient_id: text,
  doctor_id: text,
  medications: Vec(text), // List of medication names/dosages
  instructions: text,
  issued_at: text, // Date of issuance
});

const Payment = Record({
  id: text,
  appointment_id: text,
  patient_id: text,
  amount: nat64,
  status: text, //  "pending", "completed", "failed"
  payment_method: text, // "credit_card", "paypal"
});

const MedicalRecord = Record({
  patient_id: text,
  consultation_notes: Vec(text),
  prescriptions: Vec(Prescription),
  lab_results: Vec(text), // Could be a more complex structure
  immunizations: Vec(text),
});

// Message Struct
const Message = Variant({
  Success: text,
  Error: text,
  NotFound: text,
  InvalidPayload: text,
  PaymentFailed: text,
  PaymentCompleted: text,
});

// Payloads
const CreateDepartmentPayload = Record({
  name: text,
  description: text,
});

const CreateDoctorPayload = Record({
  name: text,
  department_id: text,
  image: text,
});

const CreatePatientPayload = Record({
  name: text,
  age: nat64,
  gender: text,
  phone_number: text,
  email: text,
  address: text,
  emergency_contact: Record({
    name: text,
    phone_number: text,
    relationship: text,
  }),
  allergies: Vec(text),
  current_medications: Vec(text),
  medical_history: Vec(text),
});

const CreateConsultationPayload = Record({
  patient_id: text,
  problem: text,
  department_id: text,
});

const CreateChatPayload = Record({
  patient_id: text,
  doctor_id: text,
  message: text,
  timestamp: text,
});

const CreateAppointmentPayload = Record({
  patient_id: text,
  doctor_id: text,
  reason: text,
  appointment_time: text,
});

const CreatePrescriptionPayload = Record({
  patient_id: text,
  doctor_id: text,
  medications: Vec(text),
  instructions: text,
});

const CreatePaymentPayload = Record({
  patient_id: text,
  appointment_id: text,
  amount: nat64,
  payment_method: text,
});

// Storage
const Departments = StableBTreeMap(0, text, Department);
const Doctors = StableBTreeMap(1, text, Doctor);
const Patients = StableBTreeMap(2, text, Patient);
const Consultations = StableBTreeMap(3, text, Consultation);
const Chats = StableBTreeMap(4, text, Chat);
const Appointments = StableBTreeMap(5, text, Appointment);
const Prescriptions = StableBTreeMap(6, text, Prescription);
const Payments = StableBTreeMap(7, text, Payment);
const MedicalRecords = StableBTreeMap(8, text, MedicalRecord);

export default Canister({
  // FUnction to create a Department
  createDepartment: update(
    [CreateDepartmentPayload],
    Result(Department, Message),
    (payload) => {
      // Validate the payload
      if (!payload.name) {
        return Err({ InvalidPayload: "Missing required fields" });
      }

      // Ensure that the department name is unique
      const existingDepartments = Departments.values();

      for (const department of existingDepartments) {
        if (department.name === payload.name) {
          return Err({ InvalidPayload: "Department name must be unique" });
        }
      }

      // Assuming validation passes, proceed to create the department
      const departmentId = uuidv4();
      const department = {
        id: departmentId,
        ...payload,
      };

      Departments.insert(departmentId, department);
      return Ok(department); // Successfully return the created department
    }
  ),

  // Function to get a Department by ID
  getDepartmentById: query(
    [text],
    Result(Department, Message),
    (departmentId) => {
      const departmentOpt = Departments.get(departmentId);

      if ("None" in departmentOpt) {
        return Err({
          NotFound: `Department with id=${departmentId} not found`,
        });
      }

      return Ok(departmentOpt.Some);
    }
  ),

  // Function to get all Departments
  getAllDepartments: query([], Result(Vec(Department), Message), () => {
    const departments = Departments.values();

    if (departments.length === 0) {
      return Err({ NotFound: "No departments found" });
    }

    return Ok(departments);
  }),

  // Create a Doctor
  createDoctor: update(
    [CreateDoctorPayload],
    Result(Doctor, Message),
    (payload) => {
      // Validate the payload
      if (!payload.name || !payload.department_id || !payload.image) {
        return Err({ InvalidPayload: "Missing required fields" });
      }

      // Validate the department
      const departmentOpt = Departments.get(payload.department_id);

      if ("None" in departmentOpt) {
        return Err({
          InvalidPayload: `Department with id=${payload.department_id} not found`,
        });
      }

      // Assuming validation passes, proceed to create the doctor profile
      const doctorId = uuidv4();
      const doctor = {
        id: doctorId,
        ...payload,
        owner: ic.caller(),
      };

      Doctors.insert(doctorId, doctor);
      return Ok(doctor); // Successfully return the created doctor profile
    }
  ),

  // Function to get a Doctor by ID
  getDoctorById: query([text], Result(Doctor, Message), (doctorId) => {
    const doctorOpt = Doctors.get(doctorId);

    if ("None" in doctorOpt) {
      return Err({
        NotFound: `Doctor with id=${doctorId} not found`,
      });
    }

    return Ok(doctorOpt.Some);
  }),

  // Function to get a Doctor Profile by Owner Principal using filter
  getDoctorByOwner: query([], Result(Doctor, Message), () => {
    const doctorProfiles = Doctors.values().filter((doctor) => {
      return doctor.owner.toText() === ic.caller().toText();
    });

    if (doctorProfiles.length === 0) {
      return Err({
        NotFound: `Doctor profile for owner=${ic.caller()} not found`,
      });
    }

    return Ok(doctorProfiles[0]);
  }),

  // Get Doctor by Department
  getDoctorByDepartment: query(
    [text],
    Result(Vec(Doctor), Message),
    (departmentId) => {
      const doctors = Doctors.values().filter(
        (doctor) => doctor.department_id === departmentId
      );

      if (doctors.length === 0) {
        return Err({
          NotFound: `No doctors found for department id=${departmentId}`,
        });
      }

      return Ok(doctors);
    }
  ),

  // Function to get all Doctors
  getAllDoctors: query([], Result(Vec(Doctor), Message), () => {
    const doctors = Doctors.values();

    if (doctors.length === 0) {
      return Err({ NotFound: "No doctors found" });
    }

    return Ok(doctors);
  }),

  // Create a Patient
  createPatient: update(
    [CreatePatientPayload],
    Result(Patient, Message),
    (payload) => {
      // Validate the payload
      if (!payload.name || payload.age === undefined) {
        return Err({ InvalidPayload: "Missing required fields" });
      }

      // Assuming validation passes, proceed to create the patient profile
      const patientId = uuidv4();
      const patient = {
        ...payload,
        id: patientId,
        owner: ic.caller(),
      };

      Patients.insert(patientId, patient);
      return Ok(patient); // Successfully return the created patient profile
    }
  ),

  // Function to get a Patient by ID
  getPatientById: query([text], Result(Patient, Message), (patientId) => {
    const patientOpt = Patients.get(patientId);

    if ("None" in patientOpt) {
      return Err({
        NotFound: `Patient with id=${patientId} not found`,
      });
    }

    return Ok(patientOpt.Some);
  }),

  // Function to get a Patient Profile by Owner Principal using filter
  getPatientByOwner: query([], Result(Patient, Message), () => {
    const patientProfiles = Patients.values().filter((patient) => {
      return patient.owner.toText() === ic.caller().toText();
    });

    if (patientProfiles.length === 0) {
      return Err({
        NotFound: `Patient profile for owner=${ic.caller()} not found`,
      });
    }

    return Ok(patientProfiles[0]);
  }),

  // Function to get all Patients
  getAllPatients: query([], Result(Vec(Patient), Message), () => {
    const patients = Patients.values();

    if (patients.length === 0) {
      return Err({ NotFound: "No patients found" });
    }

    return Ok(patients);
  }),

  // Create a Consultation
  createConsultation: update(
    [CreateConsultationPayload],
    Result(Consultation, Message),
    (payload) => {
      // Validate the payload
      if (!payload.patient_id || !payload.problem || !payload.department_id) {
        return Err({ InvalidPayload: "Missing required fields" });
      }

      // Validate the patient
      const patientOpt = Patients.get(payload.patient_id);

      if ("None" in patientOpt) {
        return Err({
          InvalidPayload: `Patient with id=${payload.patient_id} not found`,
        });
      }

      // Validate the department
      const departmentOpt = Departments.get(payload.department_id);

      if ("None" in departmentOpt) {
        return Err({
          InvalidPayload: `Department with id=${payload.department_id} not found`,
        });
      }

      // Assuming validation passes, proceed to create the consultation
      const consultationId = uuidv4();
      const consultation = {
        ...payload,
        id: consultationId,
      };

      Consultations.insert(consultationId, consultation);
      return Ok(consultation); // Successfully return the created consultation
    }
  ),

  // Function to get a Consultation by ID
  getConsultationById: query(
    [text],
    Result(Consultation, Message),
    (consultationId) => {
      const consultationOpt = Consultations.get(consultationId);

      if ("None" in consultationOpt) {
        return Err({
          NotFound: `Consultation with id=${consultationId} not found`,
        });
      }

      return Ok(consultationOpt.Some);
    }
  ),

  // Function to get all Consultations
  getAllConsultations: query([], Result(Vec(Consultation), Message), () => {
    const consultations = Consultations.values();

    if (consultations.length === 0) {
      return Err({ NotFound: "No consultations found" });
    }

    return Ok(consultations);
  }),

  // Create a Chat
  createChat: update([CreateChatPayload], Result(Chat, Message), (payload) => {
    // Validate the payload
    if (
      !payload.patient_id ||
      !payload.doctor_id ||
      !payload.message ||
      !payload.timestamp
    ) {
      return Err({ InvalidPayload: "Missing required fields" });
    }

    // Validate the patient
    const patientOpt = Patients.get(payload.patient_id);

    if ("None" in patientOpt) {
      return Err({
        InvalidPayload: `Patient with id=${payload.patient_id} not found`,
      });
    }

    // Validate the doctor
    const doctorOpt = Doctors.get(payload.doctor_id);

    if ("None" in doctorOpt) {
      return Err({
        InvalidPayload: `Doctor with id=${payload.doctor_id} not found`,
      });
    }

    // Assuming validation passes, proceed to create the chat
    const chatId = uuidv4();
    const chat = {
      ...payload,
      id: chatId,
    };

    Chats.insert(chatId, chat);
    return Ok(chat); // Successfully return the created chat
  }),

  // Function to get a Chat by ID
  getChatById: query([text], Result(Chat, Message), (chatId) => {
    const chatOpt = Chats.get(chatId);

    if ("None" in chatOpt) {
      return Err({
        NotFound: `Chat with id=${chatId} not found`,
      });
    }

    return Ok(chatOpt.Some);
  }),

  // Function to get all Chats
  getAllChats: query([], Result(Vec(Chat), Message), () => {
    const chats = Chats.values();

    if (chats.length === 0) {
      return Err({ NotFound: "No chats found" });
    }

    return Ok(chats);
  }),

  // Update Patient Profile
  updatePatient: update(
    [text, CreatePatientPayload],
    Result(Patient, Message),
    (patientId, payload) => {
      const patientOpt = Patients.get(patientId);

      if ("None" in patientOpt) {
        return Err({ NotFound: `Patient with id=${patientId} not found` });
      }

      const updatedPatient = {
        ...patientOpt.Some,
        ...payload,
      };
      Patients.insert(patientId, updatedPatient);
      return Ok(updatedPatient);
    }
  ),

  // Delete Patient Profile
  deletePatient: update([text], Result(Message, Message), (patientId) => {
    const patientOpt = Patients.get(patientId);

    if ("None" in patientOpt) {
      return Err({ NotFound: `Patient with id=${patientId} not found` });
    }

    Patients.remove(patientId);
    return Ok({ Success: `Patient with id=${patientId} deleted successfully` });
  }),

  // Consultation History for a Patient
  getConsultationHistoryByPatient: query(
    [text],
    Result(Vec(Consultation), Message),
    (patientId) => {
      const consultations = Consultations.values().filter(
        (consultation) => consultation.patient_id === patientId
      );

      if (consultations.length === 0) {
        return Err({
          NotFound: `No consultations found for patient id=${patientId}`,
        });
      }

      return Ok(consultations);
    }
  ),

  // Update Doctor Availability
  updateDoctorAvailability: update(
    [text, bool],
    Result(Doctor, Message),
    (doctorId, availability) => {
      const doctorOpt = Doctors.get(doctorId);

      if ("None" in doctorOpt) {
        return Err({ NotFound: `Doctor with id=${doctorId} not found` });
      }

      const updatedDoctor = {
        ...doctorOpt.Some,
        available: availability,
      };
      Doctors.insert(doctorId, updatedDoctor);
      return Ok(updatedDoctor);
    }
  ),

  // Search Doctor by Name
  searchDoctorByName: query([text], Result(Vec(Doctor), Message), (name) => {
    const matchingDoctors = Doctors.values().filter((doctor) =>
      doctor.name.toLowerCase().includes(name.toLowerCase())
    );

    if (matchingDoctors.length === 0) {
      return Err({
        NotFound: `No doctors found with name containing '${name}'`,
      });
    }

    return Ok(matchingDoctors);
  }),

  // Search Department by Name
  searchDepartmentByName: query(
    [text],
    Result(Vec(Department), Message),
    (name) => {
      const matchingDepartments = Departments.values().filter((department) =>
        department.name.toLowerCase().includes(name.toLowerCase())
      );

      if (matchingDepartments.length === 0) {
        return Err({
          NotFound: `No departments found with name containing '${name}'`,
        });
      }

      return Ok(matchingDepartments);
    }
  ),

  // Update Doctor Profile
  updateDoctor: update(
    [text, CreateDoctorPayload],
    Result(Doctor, Message),
    (doctorId, payload) => {
      const doctorOpt = Doctors.get(doctorId);

      if ("None" in doctorOpt) {
        return Err({ NotFound: `Doctor with id=${doctorId} not found` });
      }

      const updatedDoctor = {
        ...doctorOpt.Some,
        ...payload,
      };
      Doctors.insert(doctorId, updatedDoctor);
      return Ok(updatedDoctor);
    }
  ),

  // Delete Doctor Profile
  deleteDoctor: update([text], Result(Message, Message), (doctorId) => {
    const doctorOpt = Doctors.get(doctorId);

    if ("None" in doctorOpt) {
      return Err({ NotFound: `Doctor with id=${doctorId} not found` });
    }

    Doctors.remove(doctorId);
    return Ok({ Success: `Doctor with id=${doctorId} deleted successfully` });
  }),

  // Delete Department
  deleteDepartment: update([text], Result(Message, Message), (departmentId) => {
    const departmentOpt = Departments.get(departmentId);

    if ("None" in departmentOpt) {
      return Err({ NotFound: `Department with id=${departmentId} not found` });
    }

    Departments.remove(departmentId);
    return Ok({
      Success: `Department with id=${departmentId} deleted successfully`,
    });
  }),

  // Appointment Scheduling
  createAppointment: update(
    [CreateAppointmentPayload],
    Result(Appointment, Message),
    (payload) => {
      // Validate the payload
      if (
        !payload.patient_id ||
        !payload.doctor_id ||
        !payload.reason ||
        !payload.appointment_time
      ) {
        return Err({ InvalidPayload: "Missing required fields" });
      }

      // Validate the patient
      const patientOpt = Patients.get(payload.patient_id);

      if ("None" in patientOpt) {
        return Err({
          InvalidPayload: `Patient with id=${payload.patient_id} not found`,
        });
      }

      // Validate the doctor
      const doctorOpt = Doctors.get(payload.doctor_id);

      if ("None" in doctorOpt) {
        return Err({
          InvalidPayload: `Doctor with id=${payload.doctor_id} not found`,
        });
      }

      const appointmentId = uuidv4();
      const appointment = {
        ...payload,
        id: appointmentId,
        status: "scheduled",
        video_link: None,
      };

      Appointments.insert(appointmentId, appointment);
      return Ok(appointment);
    }
  ),

  // Video Conferencing Integration (Update with Video Link)
  updateAppointmentWithVideoLink: update(
    [text, text], // appointmentId, videoLink
    Result(Appointment, Message),
    (appointmentId, videoLink) => {
      // Validate the payload
      if (!videoLink && videoLink.length === 0) {
        return Err({ InvalidPayload: "Missing required fields" });
      }
      const appointmentOpt = Appointments.get(appointmentId);

      if ("None" in appointmentOpt) {
        return Err({
          NotFound: `Appointment with id=${appointmentId} not found`,
        });
      }

      const updatedAppointment = {
        ...appointmentOpt.Some,
        video_link: Some(videoLink),
      };
      Appointments.insert(appointmentId, updatedAppointment);
      return Ok(updatedAppointment);
    }
  ),

  // Prescription Management
  createPrescription: update(
    [CreatePrescriptionPayload],
    Result(Prescription, Message),
    (payload) => {
      // Validate the payload
      if (
        !payload.patient_id ||
        !payload.doctor_id ||
        !payload.medications ||
        !payload.instructions
      ) {
        return Err({ InvalidPayload: "Missing required fields" });
      }

      // Validate the patient
      const patientOpt = Patients.get(payload.patient_id);

      if ("None" in patientOpt) {
        return Err({
          InvalidPayload: `Patient with id=${payload.patient_id} not found`,
        });
      }

      // Validate the doctor
      const doctorOpt = Doctors.get(payload.doctor_id);

      if ("None" in doctorOpt) {
        return Err({
          InvalidPayload: `Doctor with id=${payload.doctor_id} not found`,
        });
      }

      const prescriptionId = uuidv4();
      const prescription = {
        ...payload,
        id: prescriptionId,
        issued_at: new Date().toISOString(),
      };

      Prescriptions.insert(prescriptionId, prescription);
      return Ok(prescription);
    }
  ),

  // Billing and Payment Processing
  initiatePayment: update(
    [CreatePaymentPayload],
    Result(Payment, Message),
    (payload) => {
      // Validate the payload
      if (
        !payload.patient_id ||
        !payload.appointment_id ||
        !payload.amount ||
        !payload.payment_method
      ) {
        return Err({ InvalidPayload: "Missing required fields" });
      }

      // Validate the patient
      const patientOpt = Patients.get(payload.patient_id);

      if ("None" in patientOpt) {
        return Err({
          InvalidPayload: `Patient with id=${payload.patient_id} not found`,
        });
      }

      // Validate the appointment
      const appointmentOpt = Appointments.get(payload.appointment_id);

      if ("None" in appointmentOpt) {
        return Err({
          InvalidPayload: `Appointment with id=${payload.appointment_id} not found`,
        });
      }

      const paymentId = uuidv4();
      const payment = {
        ...payload,
        id: paymentId,
        status: "pending",
      };

      Payments.insert(paymentId, payment);
      return Ok(payment);
    }
  ),

  updatePaymentStatus: update(
    [text, text], // paymentId, newStatus
    Result(Payment, Message),
    (paymentId, newStatus) => {
      const paymentOpt = Payments.get(paymentId);

      if ("None" in paymentOpt) {
        return Err({ NotFound: `Payment with id=${paymentId} not found` });
      }

      const updatedPayment = {
        ...paymentOpt.Some,
        status: newStatus,
      };
      Payments.insert(paymentId, updatedPayment);
      return Ok(updatedPayment);
    }
  ),

  // Medical Records and History Tracking
  getMedicalRecordsByPatient: query(
    [text], // patientId
    Result(MedicalRecord, Message),
    (patientId) => {
      const medicalRecordOpt = MedicalRecords.get(patientId);

      if ("None" in medicalRecordOpt) {
        return Err({
          NotFound: `Medical records for patient id=${patientId} not found`,
        });
      }

      return Ok(medicalRecordOpt.Some);
    }
  ),

  updateMedicalRecords: update(
    [text, MedicalRecord], // patientId, updatedRecords
    Result(MedicalRecord, Message),
    (patientId, updatedRecords) => {
      MedicalRecords.insert(patientId, updatedRecords);
      return Ok(updatedRecords);
    }
  ),

  // Calculate BMI for a Patient
  calculateBMI: query(
    [nat64, nat64], // weight (kg), height (cm)
    Result(text, Message),
    (weight, height) => {
      if (height === 0n) {
        return Err({ Error: "Height cannot be zero." });
      }

      // Convert `bigint` to `number` before performing arithmetic
      const weightInKg = Number(weight);
      const heightInMeters = Number(height) / 100;
      const bmi = weightInKg / (heightInMeters * heightInMeters);

      // Check for NaN or infinite values
      if (!isFinite(bmi)) {
        return Err({ Error: "Invalid BMI calculation." });
      }

      // BMI Categories
      let category;
      if (bmi < 18.5) {
        category = "Underweight";
      } else if (bmi < 24.9) {
        category = "Normal Weight";
      } else if (bmi < 29.9) {
        category = "Overweight";
      } else {
        category = "Obese";
      }

      return Ok(`BMI is ${bmi.toFixed(2)} - ${category}`);
    }
  ),

  // Calculate Medication Dosage based on Weight
  calculateDosage: query(
    [nat64, nat64], // patientWeight (kg), dosagePerKg
    Result(nat64, Message),
    (patientWeight, dosagePerKg) => {
      const dosage = patientWeight * dosagePerKg;
      return Ok(dosage);
    }
  ),

  estimateInsuranceCost: query(
    [nat64, bool], // baseCost, hasInsurance
    Result(nat64, Message),
    (baseCost, hasInsurance) => {
      // Define the discount rate as a regular number and calculate the discount
      const discountRate = hasInsurance ? 0.2 : 0.0;
      const discountAmount = Number(baseCost) * discountRate;

      // Calculate the total cost after discount
      const totalCost = Number(baseCost) - discountAmount;

      // Convert the result back to BigInt
      const totalCostBigInt = BigInt(Math.round(totalCost));

      return Ok(totalCostBigInt);
    }
  ),

  calculateHealthRiskScore: query(
    [nat64, nat64, nat64], // age, bmi, bloodPressure
    Result(text, Message),
    (age, bmi, bloodPressure) => {
      // Weight factors as regular numbers
      const ageFactor = 0.3;
      const bmiFactor = 0.5;
      const bpFactor = 0.2;

      // Convert nat64 inputs to numbers for calculation
      const ageNumber = Number(age);
      const bmiNumber = Number(bmi);
      const bpNumber = Number(bloodPressure);

      // Calculate weighted score as a regular number
      const riskScore =
        ageNumber * ageFactor + bmiNumber * bmiFactor + bpNumber * bpFactor;

      // Determine Risk Level
      let riskLevel;
      if (riskScore < 20) {
        riskLevel = "Low Risk";
      } else if (riskScore < 30) {
        riskLevel = "Moderate Risk";
      } else {
        riskLevel = "High Risk";
      }

      // Return the risk score and level as text
      return Ok(`Health Risk Score: ${riskScore.toFixed(2)} - ${riskLevel}`);
    }
  ),
});
