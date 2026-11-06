/* =====================================================================
   ChunkLab — Sample content
   All illustrative answers in the RAG simulation are extracted from
   HANDBOOK below, so every answer is supported by the sample document.
   (Fictional university — not a real institution's policy.)
   ===================================================================== */
(function (root) {
  'use strict';

  const LAB_SAMPLE =
    'Retrieval-Augmented Generation, or RAG, helps a language model answer questions using information from external documents. ' +
    'Before a document can be searched, its text must be extracted and cleaned. ' +
    'The clean text is then divided into smaller pieces called chunks. ' +
    'Each chunk is converted into an embedding, which is a list of numbers that represents its meaning. ' +
    'When a user asks a question, the system finds the chunks whose meaning is closest to the question. ' +
    'Only those relevant chunks are given to the language model as context. ' +
    'If chunks are too small, an idea may be split in half and lose its meaning. ' +
    'If chunks are too large, they may contain unrelated information that distracts the model. ' +
    'Overlap repeats a few words between neighbouring chunks so that ideas near a boundary are not lost.';

  const HANDBOOK =
    'Attendance Policy. Every student must maintain a minimum attendance of 75% in each course to be eligible for the end-semester examination. ' +
    'Attendance is recorded by the course instructor at the start of every class. ' +
    'Students whose attendance is between 65% and 75% may apply for condonation by submitting a valid medical certificate to the Head of Department. ' +
    'Students with attendance below 65% are not eligible for the examination and must repeat the course.\n\n' +
    'Examination Eligibility. To sit for the end-semester examination, a student must meet the attendance requirement and clear all pending fee dues. ' +
    'Hall tickets are issued through the student portal one week before the examinations begin. ' +
    'Students must carry their hall ticket and university ID card to every examination.\n\n' +
    'Assignment Submission. All assignments must be submitted through the learning portal by 11:59 PM on the due date. ' +
    'Late submissions are accepted for up to 48 hours after the deadline with a penalty of 10% of the marks for each day of delay. ' +
    'Submissions made more than 48 hours after the deadline are not accepted unless the course instructor approves an extension for a medical or family emergency.\n\n' +
    'Library Access. The central library is open from 8:00 AM to 10:00 PM, Monday to Saturday, and from 10:00 AM to 6:00 PM on Sunday. ' +
    'During examination weeks, the reading room stays open 24 hours a day. ' +
    'Students can borrow up to 4 books at a time for a period of 14 days. ' +
    'A fine of Rs 5 per day is charged for each book returned after the due date. ' +
    'A valid university ID card is required to enter the library.\n\n' +
    'Course Registration. Students must register for their courses through the student portal during the first two weeks of each semester. ' +
    'Each student must register for a minimum of 16 credits and a maximum of 24 credits per semester. ' +
    'Courses can be added or dropped until the end of the third week. ' +
    'Late registration is allowed only with the approval of the faculty advisor and a late fee of Rs 500.';

  const SAMPLE_QUESTIONS = [
    'What is the minimum attendance required?',
    'Can I submit an assignment late?',
    'What are the library timings?',
    'How many books can I borrow?',
    'How many credits must I register for?'
  ];

  // Hands-on challenge: short policy statements + related paragraphs.
  const CHALLENGE_DOC =
    'Scholarship Policy. Merit scholarships are awarded to students with a CGPA of 8.5 or above. ' +
    'The scholarship covers 50% of the tuition fee. ' +
    'It is renewed every year only if the student maintains a CGPA of at least 8.0.\n\n' +
    'Hostel Rules. Hostel gates close at 10:30 PM every night. ' +
    'Students returning after 10:30 PM must inform the warden in advance. ' +
    'Visitors are allowed in the common room between 4:00 PM and 7:00 PM.\n\n' +
    'Leave Policy. Students may take up to 5 days of personal leave per semester. ' +
    'Leave requests must be submitted on the portal at least 2 days before the leave begins. ' +
    'Medical leave longer than 3 days requires a certificate from a registered doctor.\n\n' +
    'Lab Safety. Closed shoes and lab coats are mandatory in all laboratories. ' +
    'Food and drinks are not permitted inside the lab. ' +
    'Any equipment damage must be reported to the lab assistant on the same day.';

  // Test questions used to check the student's chunking choices.
  // "answer" is the exact sentence that must stay intact for a good result.
  const CHALLENGE_TESTS = [
    {
      q: 'What CGPA must a student maintain each year to have it renewed?',
      answer: 'It is renewed every year only if the student maintains a CGPA of at least 8.0.'
    },
    {
      q: 'What time do hostel gates close?',
      answer: 'Hostel gates close at 10:30 PM every night.'
    },
    {
      q: 'When must leave requests be submitted?',
      answer: 'Leave requests must be submitted on the portal at least 2 days before the leave begins.'
    }
  ];

  root.ChunkContent = {
    LAB_SAMPLE: LAB_SAMPLE,
    HANDBOOK: HANDBOOK,
    SAMPLE_QUESTIONS: SAMPLE_QUESTIONS,
    CHALLENGE_DOC: CHALLENGE_DOC,
    CHALLENGE_TESTS: CHALLENGE_TESTS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ChunkContent;
})(typeof window !== 'undefined' ? window : this);
