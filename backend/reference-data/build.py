#!/usr/bin/env python3
"""Source-of-truth generator for the spine standards-of-care taxonomy (v0.1.0).

Edit the data in this file, then run `python3 build.py && python3 validate.py`.
Outputs the six upload-ready JSON files in this directory.
"""
import json, os

OUT = os.path.dirname(os.path.abspath(__file__))
REGIONS = {"cervical_spine": "cervical", "thoracic_spine": "thoracic", "lumbar_spine": "lumbar"}

# ----------------------------------------------------------------------------- sources
SOURCES = [
    ("nass_ldh_2012", "North American Spine Society (NASS). Evidence-Based Clinical Guidelines for Multidisciplinary Spine Care: Diagnosis and Treatment of Lumbar Disc Herniation with Radiculopathy.", "2012 (literature through July 2011)"),
    ("nass_stenosis_2011", "North American Spine Society (NASS). Evidence-Based Clinical Guidelines for Multidisciplinary Spine Care: Diagnosis and Treatment of Degenerative Lumbar Spinal Stenosis (update published as Kreiner DS et al., Spine J 2013;13(7):734-743).", "2011 revision (literature through July 2010); journal update 2013"),
    ("nass_spondylolisthesis_2014", "North American Spine Society (NASS). Evidence-Based Clinical Guidelines for Multidisciplinary Spine Care: Diagnosis and Treatment of Degenerative Lumbar Spondylolisthesis.", "2nd edition, 2014 (literature through May 2013; replaces 2008 edition)"),
    ("nass_cervical_radiculopathy_2010", "North American Spine Society (NASS). Evidence-Based Clinical Guidelines for Multidisciplinary Spine Care: Diagnosis and Treatment of Cervical Radiculopathy from Degenerative Disorders (Bono CM et al., Spine J 2011;11(1):64-72).", "2010 (journal publication January 2011)"),
    ("nass_lbp_2020", "North American Spine Society (NASS). Evidence-Based Clinical Guidelines for Multidisciplinary Spine Care: Diagnosis and Treatment of Low Back Pain (non-specific LBP).", "2020 (literature through February 2016)"),
    ("acoem_low_back_2020", "American College of Occupational and Environmental Medicine (ACOEM) Practice Guidelines: Low Back Disorders Guideline.", "February 13, 2020 (version incorporated into CA MTUS at 8 CCR 9792.23.5)"),
    ("acoem_cervical_thoracic_2018", "American College of Occupational and Environmental Medicine (ACOEM) Practice Guidelines: Cervical and Thoracic Spine Disorders Guideline.", "October 17, 2018 (version incorporated into CA MTUS at 8 CCR 9792.23.1)"),
    ("odg", "MCG Health. ODG (Official Disability Guidelines) - Treatment in Workers' Compensation: Low Back, Neck and Upper Back, and Pain (Chronic) chapters; ODG Drug Formulary.", "Continuously updated online edition (use edition current at date of service); specific text not verified - subscription content"),
    ("az_ica_odg", "Industrial Commission of Arizona. Ariz. Admin. Code R20-5-1301 et seq. (Title 20, Ch. 5, Art. 13 - Treatment Guidelines): adopts ODG as the standard reference for evidence-based medicine in Arizona workers' compensation.", "Effective 10/1/2016 (chronic pain and opioids); 10/1/2018 (all other body parts and conditions)"),
    ("ca_mtus", "California Division of Workers' Compensation. Medical Treatment Utilization Schedule (MTUS), 8 CCR 9792.20 et seq. (incorporates ACOEM guidelines by reference; acupuncture guidance at 9792.24.1 now defers to the ACOEM clinical-topic/chronic-pain guidelines).", "As of September 2026 (Low Back: ACOEM 2/13/2020; Cervical & Thoracic: ACOEM 10/17/2018; Chronic Pain update effective 6/1/2026)"),
    ("acp_lbp_2017", "Qaseem A, et al. Noninvasive Treatments for Acute, Subacute, and Chronic Low Back Pain: A Clinical Practice Guideline From the American College of Physicians. Ann Intern Med. 2017;166(7):514-530.", "2017"),
    ("nice_ng59", "National Institute for Health and Care Excellence (NICE). NG59: Low back pain and sciatica in over 16s: assessment and management.", "Published Nov 2016; updated Sep and Dec 2020; psychological-therapy and combined physical/psychological programme recommendations withdrawn July 2026"),
    ("vadod_lbp_2022", "U.S. Department of Veterans Affairs / Department of Defense. VA/DoD Clinical Practice Guideline for the Diagnosis and Treatment of Low Back Pain.", "Version 3.0, 2022"),
    ("cohen_lumbar_facet_2020", "Cohen SP, et al. Consensus practice guidelines on interventions for lumbar facet joint pain from a multispecialty, international working group. Reg Anesth Pain Med. 2020;45(6):424-467.", "2020"),
    ("hurley_cervical_facet_2022", "Hurley RW, et al. Consensus practice guidelines on interventions for cervical spine (facet) joint pain from a multispecialty international working group. Reg Anesth Pain Med. 2022;47(1):3-59.", "2022 (published online late 2021)"),
    ("aans_cns_lumbar_fusion_2014", "Eck JC, et al. Guideline update for the performance of fusion procedures for degenerative disease of the lumbar spine. Part 7: Lumbar fusion for intractable low-back pain without stenosis or spondylolisthesis. J Neurosurg Spine. 2014;21(1):42-47 (AANS/CNS Joint Section).", "2014 update"),
    ("fehlings_dcm_2017", "Fehlings MG, et al. A Clinical Practice Guideline for the Management of Patients With Degenerative Cervical Myelopathy: Recommendations for Patients With Mild, Moderate, and Severe Disease and Nonmyelopathic Patients With Evidence of Cord Compression. Global Spine J. 2017;7(3 Suppl):70S-83S (AO Spine/CSM-NA).", "2017"),
    ("cns_thoracolumbar_trauma_2019", "Congress of Neurological Surgeons Systematic Review and Evidence-Based Guidelines on the Evaluation and Treatment of Patients with Thoracolumbar Spine Trauma. Neurosurgery. 2019;84(1) (AANS/CNS endorsed).", "2019 (published online 2018)"),
    ("aans_cns_cervical_sci_2013", "Walters BC, Hadley MN, et al. Guidelines for the Management of Acute Cervical Spine and Spinal Cord Injuries: 2013 Update. Neurosurgery. 2013;72(Suppl 2).", "2013 update"),
    ("nice_ta279", "NICE Technology Appraisal TA279: Percutaneous vertebroplasty and percutaneous balloon kyphoplasty for treating osteoporotic vertebral compression fractures.", "April 2013 (on NICE static list)"),
    ("nice_ta159", "NICE Technology Appraisal TA159: Spinal cord stimulation for chronic pain of neuropathic or ischaemic origin.", "October 2008 (on NICE static list)"),
    ("jospt_neck_pain_2017", "Blanpied PR, et al. Neck Pain: Revision 2017. Clinical Practice Guidelines Linked to the International Classification of Functioning, Disability and Health From the Orthopaedic Section of the American Physical Therapy Association. J Orthop Sports Phys Ther. 2017;47(7):A1-A83.", "2017 revision"),
    ("cdc_opioids_2022", "Dowell D, et al. CDC Clinical Practice Guideline for Prescribing Opioids for Pain - United States, 2022. MMWR Recomm Rep. 2022;71(3):1-95.", "2022"),
    ("ama_guides_6th", "American Medical Association. AMA Guides to the Evaluation of Permanent Impairment, Sixth Edition - Chapter 17, The Spine and Pelvis (diagnosis-based impairment regional grids). Used for canonical diagnosis groupings only.", "Sixth Edition (2008); Chapter 17 revised in AMA Guides Sixth 2023 and Sixth 2024 digital editions"),
]

# ----------------------------------------------------------------------------- treatments catalog
# base -> (category, display name, generic aliases)
CATALOG = {
    "activity_modification": ("conservative", "Activity modification / advice to stay active and education",
        ["activity modification", "modified activity", "modified duty", "light duty", "work restrictions", "advice to stay active", "patient education", "relative rest", "ergonomic modification"]),
    "superficial_heat": ("conservative", "Superficial heat (self-applied)",
        ["heat", "heat therapy", "moist heat", "hot packs", "heat wrap", "thermotherapy"]),
    "home_exercise": ("conservative", "Home exercise program",
        ["HEP", "home exercise program", "home exercises", "self-directed exercise", "independent exercise program"]),
    "pt": ("conservative", "Physical therapy / supervised exercise therapy",
        ["PT", "P.T.", "physical therapy", "physiotherapy", "physio", "supervised exercise therapy", "therapeutic exercise", "manual therapy", "McKenzie", "MDT", "stabilization exercises", "core stabilization", "physical medicine"]),
    "manipulation": ("conservative", "Spinal manipulation / mobilization (chiropractic or osteopathic)",
        ["chiropractic", "chiropractic care", "chiropractic adjustment", "adjustment", "spinal manipulation", "SMT", "spinal manipulative therapy", "CMT", "chiropractic manipulative treatment", "OMT", "osteopathic manipulative treatment", "spinal mobilization"]),
    "acupuncture": ("conservative", "Acupuncture",
        ["acupuncture", "electroacupuncture", "acupuncturist", "acupuncture treatment"]),
    "massage": ("conservative", "Massage / soft tissue therapy",
        ["massage", "massage therapy", "soft tissue mobilization", "STM", "myofascial release", "LMT"]),
    "mind_body_exercise": ("conservative", "Yoga / tai chi (mind-body exercise)",
        ["yoga", "tai chi", "mind-body exercise"]),
    "cbt": ("conservative", "Cognitive behavioral therapy / psychological pain treatment",
        ["CBT", "cognitive behavioral therapy", "cognitive behavioural therapy", "psychotherapy", "pain psychology", "psychological treatment", "behavioral pain management", "mindfulness-based stress reduction", "MBSR", "pain coping skills training"]),
    "spinal_orthosis": ("conservative", "Spinal orthosis / bracing (fracture management)",
        ["brace", "bracing", "orthosis", "spinal orthosis"]),
    "acetaminophen": ("medication", "Acetaminophen",
        ["acetaminophen", "Tylenol", "paracetamol", "APAP"]),
    "nsaids": ("medication", "NSAIDs (oral non-steroidal anti-inflammatory drugs)",
        ["NSAID", "NSAIDs", "non-steroidal anti-inflammatory", "anti-inflammatory", "ibuprofen", "Motrin", "Advil", "naproxen", "Naprosyn", "Aleve", "Anaprox", "meloxicam", "Mobic", "diclofenac", "Voltaren", "celecoxib", "Celebrex", "etodolac", "nabumetone", "Relafen", "ketorolac", "Toradol", "indomethacin"]),
    "muscle_relaxants": ("medication", "Skeletal muscle relaxants (short course)",
        ["muscle relaxant", "muscle relaxants", "cyclobenzaprine", "Flexeril", "Amrix", "methocarbamol", "Robaxin", "tizanidine", "Zanaflex", "baclofen", "metaxalone", "Skelaxin", "carisoprodol", "Soma", "orphenadrine", "Norflex", "chlorzoxazone"]),
    "neuropathic_agents": ("medication", "Neuropathic pain agents (gabapentinoids / tricyclics)",
        ["gabapentin", "Neurontin", "Gralise", "pregabalin", "Lyrica", "anticonvulsant", "antiepileptic", "AED", "amitriptyline", "Elavil", "nortriptyline", "Pamelor", "tricyclic antidepressant", "TCA"]),
    "duloxetine_snri": ("medication", "Duloxetine / SNRI antidepressant",
        ["duloxetine", "Cymbalta", "SNRI", "venlafaxine", "Effexor"]),
    "oral_steroids": ("medication", "Oral corticosteroid taper (short course)",
        ["oral steroids", "prednisone", "Medrol Dosepak", "Medrol dose pack", "methylprednisolone taper", "steroid taper", "steroid burst", "oral dexamethasone"]),
    "opioids_short_course": ("medication", "Opioid analgesics (short course)",
        ["opioid", "opiate", "narcotic", "hydrocodone", "Norco", "Vicodin", "oxycodone", "Percocet", "OxyContin", "tramadol", "Ultram", "tapentadol", "Nucynta", "codeine", "Tylenol #3", "morphine", "hydromorphone", "Dilaudid"]),
    "trigger_point_injection": ("injection", "Trigger point injections",
        ["TPI", "TPIs", "trigger point injection", "trigger point injections", "myofascial trigger point injection"]),
    "esi_interlaminar": ("injection", "Interlaminar epidural steroid injection",
        ["ILESI", "IL ESI", "interlaminar ESI", "interlaminar epidural steroid injection", "interlaminar epidural", "ESI", "epidural steroid injection", "epidural injection", "epidural"]),
    "esi_transforaminal": ("injection", "Transforaminal epidural steroid injection / selective nerve root block",
        ["TFESI", "TF ESI", "transforaminal ESI", "transforaminal epidural steroid injection", "transforaminal epidural", "selective nerve root block", "SNRB", "nerve root block", "periradicular injection"]),
    "esi_caudal": ("injection", "Caudal epidural steroid injection",
        ["caudal ESI", "caudal epidural", "caudal epidural steroid injection", "caudal injection"]),
    "medial_branch_block": ("injection", "Medial branch block (diagnostic facet nerve block)",
        ["MBB", "MBBs", "medial branch block", "medial branch nerve block", "diagnostic facet block", "facet nerve block", "comparative local anesthetic block"]),
    "facet_ia_injection": ("injection", "Intra-articular facet joint injection",
        ["facet injection", "facet joint injection", "intra-articular facet injection", "IA facet injection", "zygapophyseal joint injection", "Z-joint injection", "facet block"]),
    "rfa": ("injection", "Radiofrequency ablation of medial branch nerves (facet denervation)",
        ["RFA", "radiofrequency ablation", "RF ablation", "radiofrequency neurotomy", "RFN", "rhizotomy", "facet rhizotomy", "radiofrequency denervation", "medial branch neurotomy", "RF lesioning"]),
    "vertebral_augmentation": ("surgical", "Vertebral augmentation (vertebroplasty / kyphoplasty)",
        ["vertebroplasty", "kyphoplasty", "balloon kyphoplasty", "vertebral augmentation", "PVP", "BKP"]),
    "spinal_cord_stimulator": ("surgical", "Spinal cord stimulator (trial and implant)",
        ["SCS", "spinal cord stimulator", "spinal cord stimulation", "SCS trial", "dorsal column stimulator", "neurostimulator", "neuromodulation"]),
    "functional_restoration": ("multimodal", "Functional restoration / interdisciplinary pain rehabilitation program",
        ["FRP", "functional restoration", "functional restoration program", "interdisciplinary pain program", "multidisciplinary pain program", "chronic pain program", "interdisciplinary rehabilitation", "multidisciplinary rehabilitation", "pain rehabilitation program"]),
    "work_conditioning": ("multimodal", "Work conditioning / work hardening",
        ["work conditioning", "work hardening", "work reconditioning", "work hardening program"]),
    # region-specific surgical rows (base name already implies region)
    "microdiscectomy": ("surgical", "Lumbar discectomy / microdiscectomy",
        ["microdiscectomy", "discectomy", "microlumbar discectomy", "MLD", "lumbar discectomy", "hemilaminotomy and discectomy", "laminotomy and discectomy", "endoscopic discectomy"]),
    "laminectomy": ("surgical", "Decompression (laminectomy / laminotomy / foraminotomy)",
        ["laminectomy", "decompressive laminectomy", "laminotomy", "hemilaminectomy", "foraminotomy", "decompression", "spinal decompression"]),
    "fusion": ("surgical", "Spinal fusion (instrumented arthrodesis)",
        ["fusion", "spinal fusion", "arthrodesis", "instrumented fusion", "pedicle screw fixation"]),
    "revision_surgery": ("surgical", "Revision spine surgery (pseudarthrosis repair, recurrent herniation, hardware, adjacent segment)",
        ["revision surgery", "revision fusion", "pseudarthrosis repair", "hardware removal", "re-exploration", "adjacent segment surgery", "redo surgery"]),
    "acdf": ("surgical", "Anterior cervical discectomy/corpectomy and fusion (ACDF/ACCF)",
        ["ACDF", "anterior cervical discectomy and fusion", "anterior cervical fusion", "anterior cervical decompression and fusion", "anterior cervical discectomy", "ACCF", "anterior cervical corpectomy and fusion", "corpectomy"]),
    "disc_arthroplasty": ("surgical", "Cervical disc arthroplasty (artificial disc replacement)",
        ["cervical disc arthroplasty", "CDA", "total disc replacement", "TDR", "artificial disc", "disc replacement", "disc arthroplasty"]),
    "posterior_foraminotomy": ("surgical", "Posterior cervical foraminotomy",
        ["posterior cervical foraminotomy", "keyhole foraminotomy", "laminoforaminotomy", "posterior foraminotomy"]),
    "laminoplasty": ("surgical", "Cervical laminoplasty",
        ["laminoplasty", "open-door laminoplasty", "French-door laminoplasty"]),
    "posterior_fusion": ("surgical", "Posterior cervical decompression and fusion (laminectomy and fusion)",
        ["posterior cervical fusion", "posterior cervical decompression and fusion", "PCDF", "laminectomy and fusion", "cervical laminectomy", "lateral mass fusion", "lateral mass screws", "C1-C2 fusion"]),
    "thoracic_discectomy": ("surgical", "Thoracic discectomy",
        ["thoracic discectomy", "costotransversectomy", "thoracoscopic discectomy", "transpedicular discectomy"]),
}

# region-specific display-name tweaks and extra aliases: (base, short) -> (name override or None, [extra aliases])
REGION_EXTRAS = {
    ("pt", "cervical"): (None, ["cervical PT", "neck PT"]),
    ("pt", "lumbar"): (None, ["lumbar PT", "back PT"]),
    ("pt", "thoracic"): (None, ["thoracic PT"]),
    ("spinal_orthosis", "cervical"): (None, ["cervical collar", "hard collar", "Aspen collar", "Miami J collar", "Philadelphia collar", "halo vest", "CTO"]),
    ("spinal_orthosis", "thoracic"): (None, ["TLSO", "Jewett brace", "CASH brace", "hyperextension brace"]),
    ("spinal_orthosis", "lumbar"): (None, ["LSO", "TLSO", "lumbar brace", "lumbosacral orthosis"]),
    ("esi_interlaminar", "cervical"): (None, ["cervical ESI", "cervical epidural steroid injection", "cervical epidural"]),
    ("esi_interlaminar", "thoracic"): (None, ["thoracic ESI", "thoracic epidural steroid injection", "thoracic epidural"]),
    ("esi_interlaminar", "lumbar"): (None, ["LESI", "lumbar ESI", "lumbar epidural steroid injection", "lumbar epidural"]),
    ("medial_branch_block", "cervical"): (None, ["cervical MBB", "third occipital nerve block", "TON block"]),
    ("medial_branch_block", "lumbar"): (None, ["lumbar MBB"]),
    ("rfa", "cervical"): (None, ["cervical RFA"]),
    ("rfa", "lumbar"): (None, ["lumbar RFA"]),
    ("fusion", "lumbar"): ("Lumbar fusion (TLIF/PLIF/ALIF/LLIF/posterolateral)", ["lumbar fusion", "TLIF", "PLIF", "ALIF", "XLIF", "LLIF", "OLIF", "posterolateral fusion", "PLF", "360 fusion", "circumferential fusion", "decompression and fusion"]),
    ("fusion", "thoracic"): ("Thoracic / thoracolumbar fusion and stabilization", ["thoracic fusion", "thoracolumbar fusion", "posterior spinal fusion", "PSF"]),
    ("laminectomy", "lumbar"): ("Lumbar decompression (laminectomy / laminotomy / foraminotomy)", ["lumbar laminectomy", "lumbar decompression"]),
    ("laminectomy", "thoracic"): ("Thoracic decompression (laminectomy)", ["thoracic laminectomy", "thoracic decompression"]),
    ("revision_surgery", "lumbar"): (None, ["redo discectomy", "revision discectomy", "revision lumbar fusion"]),
    ("revision_surgery", "cervical"): (None, ["revision ACDF", "revision cervical fusion"]),
}

# ----------------------------------------------------------------------------- canonical diagnoses
# (id, region_id, label, description, icdPrefixes)
DX = [
    # ---- lumbar
    ("lumbar_nonspecific_strain_sprain", "lumbar_spine", "Non-specific low back pain / lumbar strain-sprain",
     "Axial low back pain without radicular findings, fracture or specific structural pathology; includes lumbar sprain/strain and muscle spasm. Corresponds to AMA Guides lumbar non-specific/soft-tissue rows.",
     ["M54.5", "M54.50", "M54.59", "S33.5", "S39.012", "M62.830"]),
    ("lumbar_disc_herniation_radiculopathy", "lumbar_spine", "Lumbar disc herniation with radiculopathy (sciatica)",
     "Lumbar/lumbosacral disc herniation or displacement with concordant radicular pain, sensory or motor findings; includes sciatica and lumbar radiculopathy codes when a compressive disc lesion is the presumed cause.",
     ["M51.16", "M51.17", "M51.26", "M51.27", "M54.16", "M54.17", "M54.3", "M54.4"]),
    ("lumbar_spinal_stenosis", "lumbar_spine", "Degenerative lumbar spinal stenosis (neurogenic claudication / radiculopathy)",
     "Central, lateral recess or foraminal stenosis from degenerative change producing neurogenic claudication and/or radiculopathy, without significant spondylolisthesis.",
     ["M48.06", "M48.061", "M48.062", "M48.07", "M47.26", "M47.27"]),
    ("lumbar_spondylolisthesis", "lumbar_spine", "Lumbar spondylolisthesis / spondylolysis (degenerative or isthmic)",
     "Degenerative or isthmic (pars defect) slip or segmental instability, with axial pain and/or stenosis-type symptoms (claudication, radiculopathy).",
     ["M43.16", "M43.17", "M43.06", "M43.07", "Q76.2", "M53.2X6", "M53.2X7"]),
    ("lumbar_facet_degenerative_disc", "lumbar_spine", "Lumbar facet arthropathy / degenerative disc disease (axial spondylotic or discogenic pain)",
     "Chronic axial low back pain attributed to facet (zygapophyseal) arthropathy, spondylosis or disc degeneration without radiculopathy, stenosis or instability; includes vertebrogenic low back pain (M54.51).",
     ["M47.816", "M47.817", "M47.896", "M47.897", "M51.36", "M51.37", "M54.51"]),
    ("lumbar_fracture", "lumbar_spine", "Lumbar vertebral fracture / dislocation (traumatic or osteoporotic compression)",
     "Traumatic fractures or dislocations of lumbar vertebrae and osteoporotic/insufficiency compression fractures. M80.08 is not region-specific; resolve region from documentation.",
     ["S32.0", "S33.1", "M48.56", "M48.57", "M80.08"]),
    ("lumbar_post_surgical", "lumbar_spine", "Post-surgical lumbar spine / failed back surgery syndrome",
     "Persistent or recurrent pain after lumbar spine surgery (post-laminectomy syndrome, pseudarthrosis, adjacent-segment disease, epidural fibrosis). M96.1, M96.0 and Z98.1 are not region-specific; resolve region from operative history.",
     ["M96.1", "M96.0", "Z98.1"]),
    # ---- cervical
    ("cervical_nonspecific_strain_sprain", "cervical_spine", "Non-specific neck pain / cervical strain-sprain (incl. whiplash-associated disorder)",
     "Axial neck pain without radicular or myelopathic findings, fracture or specific structural pathology; includes cervical sprain/strain and whiplash-associated disorder grades I-II.",
     ["M54.2", "S13.4", "S16.1", "M53.1"]),
    ("cervical_radiculopathy", "cervical_spine", "Cervical radiculopathy (disc herniation or foraminal stenosis)",
     "Cervical nerve-root compression from disc herniation or spondylotic foraminal stenosis with concordant radicular pain, sensory, motor or reflex findings (NASS degenerative cervical radiculopathy).",
     ["M50.1", "M50.2", "M54.12", "M54.13", "M47.22", "M47.23"]),
    ("cervical_myelopathy_stenosis", "cervical_spine", "Degenerative cervical myelopathy / central canal stenosis",
     "Spinal cord compression from spondylosis, disc disease, OPLL or central stenosis with or without clinical myelopathy.",
     ["M50.0", "M47.12", "M47.13", "M48.02", "M48.03"]),
    ("cervical_facet_degenerative", "cervical_spine", "Cervical facet arthropathy / degenerative disc disease (axial spondylosis)",
     "Chronic axial neck pain (with or without cervicogenic headache) attributed to facet arthropathy, spondylosis or disc degeneration without radiculopathy or myelopathy.",
     ["M47.812", "M47.813", "M47.892", "M47.893", "M50.3"]),
    ("cervical_fracture", "cervical_spine", "Cervical vertebral fracture / dislocation",
     "Traumatic fracture, subluxation or dislocation of C1-C7 and pathological/collapsed cervical vertebra.",
     ["S12.0", "S12.1", "S12.2", "S12.3", "S12.4", "S12.5", "S12.6", "S12.9", "S13.1", "M48.52"]),
    ("cervical_post_surgical", "cervical_spine", "Post-surgical cervical spine (post-laminectomy syndrome, pseudarthrosis, adjacent segment)",
     "Persistent or recurrent neck/arm pain after cervical spine surgery. M96.1, M96.0 and Z98.1 are not region-specific; resolve region from operative history.",
     ["M96.1", "M96.0", "Z98.1"]),
    # ---- thoracic
    ("thoracic_nonspecific_strain_sprain", "thoracic_spine", "Non-specific thoracic pain / thoracic strain-sprain",
     "Mid-back pain without radicular or myelopathic findings, fracture or specific structural pathology; includes thoracic sprain/strain and muscle spasm.",
     ["M54.6", "S23.3", "S29.012", "M62.830"]),
    ("thoracic_disc_herniation_radiculopathy", "thoracic_spine", "Thoracic disc herniation with radiculopathy",
     "Thoracic or thoracolumbar disc herniation/spondylosis with concordant thoracic radicular (band-like intercostal) pain, without myelopathy.",
     ["M51.14", "M51.15", "M51.24", "M51.25", "M54.14", "M54.15", "M47.24", "M47.25"]),
    ("thoracic_myelopathy_stenosis", "thoracic_spine", "Thoracic stenosis / myelopathy (disc, OLF, spondylosis)",
     "Thoracic spinal cord compression from disc herniation, ossified ligamentum flavum or spondylosis with myelopathic signs or high-grade stenosis.",
     ["M51.04", "M51.05", "M48.04", "M48.05", "M47.14", "M47.15"]),
    ("thoracic_facet_degenerative", "thoracic_spine", "Thoracic facet arthropathy / degenerative disc disease (axial spondylosis)",
     "Chronic axial thoracic pain attributed to spondylosis, facet arthropathy or disc degeneration without radiculopathy or myelopathy.",
     ["M47.814", "M47.815", "M47.894", "M47.895", "M51.34", "M51.35"]),
    ("thoracic_fracture", "thoracic_spine", "Thoracic vertebral fracture / dislocation (traumatic or osteoporotic compression)",
     "Traumatic fracture, subluxation or dislocation of T1-T12 and osteoporotic/insufficiency compression fractures. M80.08 is not region-specific; resolve region from documentation.",
     ["S22.0", "S23.1", "M48.54", "M48.55", "M80.08"]),
]

# ----------------------------------------------------------------------------- reusable adequacy text
A = {
    "am": "Adequate when advice to stay active/avoid bed rest and education are documented alongside active care; not a stand-alone trial.",
    "heat": "Self-applied during the acute phase; optional adjunct - absence does not preclude MMI.",
    "hep": "Adequate when a program is taught (usually during PT) and ongoing independent adherence is documented.",
    "pt": "About 10 visits over 8 weeks (typical ODG benchmark) with documented objective functional progress, then fading to HEP; more visits only with measurable gains.",
    "pt_postop_lumbar": "Post-op benchmarks roughly 16 visits/8 weeks after discectomy or decompression and up to about 34 visits/16 weeks after fusion (ODG-style); continue only with objective gains.",
    "pt_postop_cervical": "Post-op benchmarks roughly 16-24 visits over 8-16 weeks after decompression or fusion (ODG-style); continue only with objective gains.",
    "manip": "Trial of about 6 visits over 2 weeks; continue up to about 18 visits over 6-8 weeks only with objective functional improvement; maintenance care not required for MMI.",
    "acu": "Trial of about 3-6 sessions to show functional improvement; continue up to about 8-12 sessions over 4-8 weeks only with documented gains.",
    "massage": "Time-limited adjunct to active exercise (about 4-6 sessions); optional - absence does not preclude MMI.",
    "yoga": "Structured program of about 8-12 weeks; optional - absence does not preclude MMI.",
    "cbt": "Initial 3-4 sessions over 2 weeks; up to about 6-10 sessions over 5-6 weeks with documented functional improvement.",
    "apap": "Optional; scheduled trial of 1-2 weeks at up to 3-4 g/day; absence does not preclude MMI.",
    "nsaid": "Scheduled trial of about 2-4 weeks at therapeutic dose, or documented intolerance/contraindication; lowest effective dose for shortest duration.",
    "mr": "Short course of 2-3 weeks or less for acute pain or flare; long-term use is not recommended and not required for MMI.",
    "neuro": "Titrate to effective/tolerated dose (e.g., gabapentin 1200-1800 mg/day or pregabalin 150-300 mg/day) for about 4-8 weeks; optional - absence does not preclude MMI.",
    "snri": "Trial of about 4-8 weeks at therapeutic dose (e.g., duloxetine 60 mg/day); stop if no meaningful benefit.",
    "steroid": "One short taper (about 5-15 days) in the acute phase; repeat courses not recommended; optional.",
    "opioid": "Not a required rung; if used, short course (a few days, generally 7 days or less for acute pain); long-term opioid therapy is not required to establish MMI.",
    "tpi": "Repeat only if 50% or more relief for 6 or more weeks with functional gain; injections no more often than every 2 months, 3-4 or fewer per session.",
    "esi": "Up to 2 injections in the diagnostic phase; repeat only if 50% or more relief with functional gain/medication reduction for 6-8 weeks; generally no more than 4 per region per year.",
    "mbb": "One (or two, per payer) diagnostic block set per level; a positive result is 50-80% concordant relief for the anesthetic's duration; a negative block ends the facet pathway.",
    "facet_ia": "Single diagnostic/therapeutic injection per level; repeat only with documented prolonged relief; not required for MMI.",
    "rfa": "One ablation per level after positive diagnostic block(s); repeat only if 50% or more relief lasted 3-6 months or longer with functional gain, generally no more often than every 6 months.",
    "scs": "Requires psychological screening and a successful trial (50% or more relief); adequate once implanted and programming optimized; not required for MMI if not a candidate or declined.",
    "frp": "Continuation beyond 2 weeks requires documented objective gains; total generally 20 full-day sessions (or part-day equivalent) or fewer.",
    "wc": "Time-limited (about 4-8 weeks) toward a defined return-to-work goal; continue beyond 2 weeks only with documented compliance and significant gains.",
    "surg": "Adequate once performed and post-op rehabilitation completed. Not required for MMI if not indicated, contraindicated, or declined by an informed patient.",
    "orth": "Worn per treating-surgeon protocol until radiographic healing (typically 6-12 weeks); adequate when bracing is completed with healing documented.",
    "va": "Single procedure per fracture level; adequate once performed; not required for MMI.",
}

# ----------------------------------------------------------------------------- ladders
# dx_id -> list of (treatment base, applicability, adequacy, [source ids])   (order = ladder order, conservative first)
L = {
"lumbar_nonspecific_strain_sprain": [
    ("activity_modification", "First-line for all acute and chronic non-specific LBP; advise to stay active, avoid bed rest, give reassurance.", A["am"], ["acp_lbp_2017", "nice_ng59", "acoem_low_back_2020"]),
    ("superficial_heat", "Acute/subacute LBP as first-line non-drug option.", A["heat"], ["acp_lbp_2017"]),
    ("home_exercise", "All phases; core of self-management after instruction.", A["hep"], ["nice_ng59", "acoem_low_back_2020"]),
    ("pt", "Subacute or chronic LBP, or acute LBP not improving with self-care; active exercise-based therapy preferred over passive modalities.", A["pt"], ["acp_lbp_2017", "nice_ng59", "acoem_low_back_2020", "odg"]),
    ("manipulation", "Acute or chronic LBP without red flags; NICE supports manual therapy only as part of a package with exercise.", A["manip"], ["acp_lbp_2017", "nice_ng59", "vadod_lbp_2022"]),
    ("acupuncture", "Acute or chronic LBP (ACP); note NICE NG59 recommends against acupuncture for LBP.", A["acu"], ["acp_lbp_2017", "vadod_lbp_2022"]),
    ("massage", "Acute/subacute LBP (ACP); NICE supports only with exercise.", A["massage"], ["acp_lbp_2017", "nice_ng59"]),
    ("nsaids", "First-line medication if non-drug care insufficient; screen for GI, renal and cardiovascular risk.", A["nsaid"], ["acp_lbp_2017", "nice_ng59", "acoem_low_back_2020"]),
    ("muscle_relaxants", "Acute LBP with spasm (ACP); avoid in chronic phase; sedation and misuse risk (avoid carisoprodol).", A["mr"], ["acp_lbp_2017", "acoem_low_back_2020"]),
    ("acetaminophen", "Alternative when NSAIDs are contraindicated; ACP and NICE found little or no benefit as monotherapy.", A["apap"], ["acoem_low_back_2020"]),
    ("duloxetine_snri", "Chronic LBP after inadequate response to non-drug care (ACP second-line); NICE NG59 recommends against antidepressants for LBP.", A["snri"], ["acp_lbp_2017"]),
    ("opioids_short_course", "Severe acute pain only when NSAIDs are contraindicated or ineffective; not for chronic LBP (NICE).", A["opioid"], ["acp_lbp_2017", "nice_ng59", "cdc_opioids_2022"]),
    ("mind_body_exercise", "Chronic LBP as an alternative exercise modality.", A["yoga"], ["acp_lbp_2017", "vadod_lbp_2022"]),
    ("cbt", "Chronic LBP or psychosocial risk factors (fear-avoidance, catastrophizing); NICE psychological recommendations withdrawn 2026.", A["cbt"], ["acp_lbp_2017", "vadod_lbp_2022"]),
    ("trigger_point_injection", "Only for myofascial pain with documented trigger points (twitch response, referred pain), symptoms over 3 months, failed stretching/PT/medication, and no radiculopathy.", A["tpi"], ["odg"]),
    ("functional_restoration", "Chronic disabling LBP (over 3-6 months) after failed conventional care, with motivation to improve and no pending surgery.", A["frp"], ["acp_lbp_2017", "odg"]),
    ("work_conditioning", "Work-related LBP with a documented gap between current function and job demands after PT, and an identified job to return to.", A["wc"], ["odg"]),
],
"lumbar_disc_herniation_radiculopathy": [
    ("activity_modification", "All patients; most improve within 6-12 weeks, so advise to stay active and give natural-history education.", A["am"], ["nice_ng59", "acoem_low_back_2020"]),
    ("home_exercise", "All phases, as tolerated.", A["hep"], ["nice_ng59", "odg"]),
    ("pt", "Active exercise-based therapy once acute pain allows; NASS found insufficient evidence for PT as stand-alone treatment.", A["pt"], ["nice_ng59", "acoem_low_back_2020", "odg"]),
    ("manipulation", "Option for symptomatic relief without progressive neuro deficit (NASS Grade C); NICE supports only with exercise.", A["manip"], ["nass_ldh_2012", "nice_ng59"]),
    ("nsaids", "First-line analgesic; NICE notes limited evidence of benefit and risk of harms in sciatica.", A["nsaid"], ["acoem_low_back_2020", "nice_ng59"]),
    ("oral_steroids", "Guidance conflicts: may be used for acute radicular pain per ODG; NICE NG59 (2020) recommends against oral corticosteroids for sciatica.", A["steroid"], ["odg"]),
    ("neuropathic_agents", "Guidance conflicts: ODG supports AED trial for neuropathic pain; NICE NG59 (2020) recommends against gabapentinoids/antiepileptics for sciatica.", A["neuro"], ["odg"]),
    ("opioids_short_course", "Short course for severe acute radicular pain only; not for chronic sciatica (NICE 2020).", A["opioid"], ["nice_ng59", "cdc_opioids_2022"]),
    ("esi_transforaminal", "Radicular pain with concordant exam and imaging not responding to conservative care; short-term relief (NASS Grade A).", A["esi"], ["nass_ldh_2012", "nice_ng59", "acoem_low_back_2020", "odg"]),
    ("esi_interlaminar", "Same indications as TFESI; alternative approach for single- or multi-level radicular pain.", A["esi"], ["nice_ng59", "acoem_low_back_2020", "odg"]),
    ("esi_caudal", "Alternative approach (e.g., L5-S1/S1 or post-surgical anatomy); same indications and limits as other ESIs.", A["esi"], ["odg"]),
    ("microdiscectomy", "Concordant radiculopathy and imaging with disabling symptoms after 6 weeks or more of conservative care; urgent for progressive motor deficit or cauda equina.", A["surg"], ["nass_ldh_2012", "nice_ng59", "acoem_low_back_2020", "odg"]),
    ("functional_restoration", "Chronic disability over 3-6 months after failed or declined surgery and injections.", A["frp"], ["odg"]),
],
"lumbar_spinal_stenosis": [
    ("activity_modification", "All patients; education on flexion-based positions and walking tolerance.", A["am"], ["acoem_low_back_2020", "odg"]),
    ("home_exercise", "All patients; flexion-biased and conditioning exercise (e.g., cycling).", A["hep"], ["odg"]),
    ("pt", "Mild-moderate symptoms as initial care; NASS rates evidence for PT/exercise alone as limited.", A["pt"], ["acoem_low_back_2020", "odg"]),
    ("nsaids", "First-line analgesic, weighed against GI, renal and CV risk in older patients.", A["nsaid"], ["acoem_low_back_2020", "odg"]),
    ("neuropathic_agents", "Optional for radicular/neuropathic leg pain; evidence limited.", A["neuro"], ["odg"]),
    ("opioids_short_course", "Short course for severe flare only.", A["opioid"], ["cdc_opioids_2022"]),
    ("esi_interlaminar", "Radiculopathy or neurogenic claudication; image-guided ESI gives short-term relief (NASS), long-term benefit uncertain.", A["esi"], ["nass_stenosis_2011", "odg"]),
    ("esi_transforaminal", "Radicular (lateral recess/foraminal) pattern; same limits as other ESIs.", A["esi"], ["nass_stenosis_2011", "odg"]),
    ("esi_caudal", "Multilevel stenosis or post-surgical anatomy; same limits as other ESIs.", A["esi"], ["nass_stenosis_2011", "odg"]),
    ("laminectomy", "Moderate-severe symptoms with concordant imaging after failed conservative care (typically 3 months or more); fusion not required without instability.", A["surg"], ["nass_stenosis_2011", "odg"]),
],
"lumbar_spondylolisthesis": [
    ("activity_modification", "All patients; education and activity pacing.", A["am"], ["acoem_low_back_2020", "odg"]),
    ("home_exercise", "All patients; stabilization and conditioning.", A["hep"], ["odg"]),
    ("pt", "Initial care for axial or mild neurogenic symptoms; NASS found insufficient evidence for specific non-operative regimens.", A["pt"], ["acoem_low_back_2020", "odg"]),
    ("nsaids", "First-line analgesic, subject to risk profile.", A["nsaid"], ["acoem_low_back_2020", "odg"]),
    ("opioids_short_course", "Short course for severe flare only.", A["opioid"], ["cdc_opioids_2022"]),
    ("esi_interlaminar", "Radiculopathy or neurogenic claudication from associated stenosis; evidence extrapolated from stenosis literature.", A["esi"], ["odg"]),
    ("esi_transforaminal", "Radicular/foraminal symptoms (e.g., isthmic foraminal stenosis); same limits as other ESIs.", A["esi"], ["odg"]),
    ("laminectomy", "Decompression alone may be considered in select degenerative slips with stenosis without dynamic instability.", A["surg"], ["nass_spondylolisthesis_2014", "odg"]),
    ("fusion", "Decompression with fusion for symptomatic degenerative spondylolisthesis with stenosis (NASS), or isthmic slip/instability after failed non-operative care.", A["surg"], ["nass_spondylolisthesis_2014", "odg"]),
],
"lumbar_facet_degenerative_disc": [
    ("activity_modification", "All patients; reassurance that degeneration is common and not dangerous.", A["am"], ["acp_lbp_2017", "nice_ng59"]),
    ("home_exercise", "All patients.", A["hep"], ["nice_ng59", "odg"]),
    ("pt", "Chronic axial LBP; active exercise-based therapy.", A["pt"], ["acp_lbp_2017", "nice_ng59", "odg"]),
    ("manipulation", "Chronic axial LBP without instability.", A["manip"], ["acp_lbp_2017", "vadod_lbp_2022"]),
    ("acupuncture", "Chronic LBP (ACP); NICE recommends against.", A["acu"], ["acp_lbp_2017", "vadod_lbp_2022"]),
    ("nsaids", "First-line medication for flares/chronic pain at lowest effective dose.", A["nsaid"], ["acp_lbp_2017", "nice_ng59", "acoem_low_back_2020"]),
    ("duloxetine_snri", "Chronic LBP after non-drug care (ACP second-line); NICE recommends against.", A["snri"], ["acp_lbp_2017"]),
    ("mind_body_exercise", "Chronic LBP as an alternative exercise modality.", A["yoga"], ["acp_lbp_2017", "vadod_lbp_2022"]),
    ("cbt", "Chronic LBP with psychosocial contributors.", A["cbt"], ["acp_lbp_2017", "vadod_lbp_2022"]),
    ("medial_branch_block", "Suspected facet pain (axial, non-radicular) after about 3 months of failed conservative care; prognostic for RFA.", A["mbb"], ["cohen_lumbar_facet_2020", "odg"]),
    ("facet_ia_injection", "Alternative diagnostic block when MBB not used; therapeutic steroid benefit is limited.", A["facet_ia"], ["cohen_lumbar_facet_2020"]),
    ("rfa", "Facet pain confirmed by positive diagnostic block(s), 2 levels or fewer bilaterally, no radiculopathy.", A["rfa"], ["cohen_lumbar_facet_2020", "odg", "nice_ng59"]),
    ("functional_restoration", "Chronic disabling axial LBP; intensive interdisciplinary rehab is a comparable alternative to fusion (AANS/CNS 2014).", A["frp"], ["acp_lbp_2017", "aans_cns_lumbar_fusion_2014", "odg"]),
    ("fusion", "Highly selected 1-2 level discogenic pain after failure of comprehensive care including rehab (AANS/CNS 2014); NICE NG59 advises against fusion for LBP outside trials. Optional.", A["surg"], ["aans_cns_lumbar_fusion_2014"]),
],
"lumbar_fracture": [
    ("activity_modification", "Early mobilization as tolerated for stable fractures; avoid prolonged bed rest.", A["am"], ["cns_thoracolumbar_trauma_2019"]),
    ("spinal_orthosis", "Stable, neurologically intact fractures per surgeon preference; CNS 2019 found similar outcomes with or without bracing for intact burst fractures.", A["orth"], ["cns_thoracolumbar_trauma_2019"]),
    ("acetaminophen", "Baseline analgesic for fracture pain.", A["apap"], ["acoem_low_back_2020"]),
    ("nsaids", "Short-course analgesia as appropriate to healing and risk profile.", A["nsaid"], ["acoem_low_back_2020"]),
    ("opioids_short_course", "Severe acute fracture or post-operative pain; taper promptly.", A["opioid"], ["cdc_opioids_2022"]),
    ("pt", "After fracture stability/healing is confirmed or post-operatively; mobility, strengthening, return to function.", "About 8 visits over 10 weeks for non-operative fractures (ODG-style benchmark); post-op per post-surgical benchmarks; continue only with objective gains.", ["odg"]),
    ("home_exercise", "After instruction in PT.", A["hep"], ["odg"]),
    ("vertebral_augmentation", "Osteoporotic compression fracture with severe ongoing pain despite optimal analgesia and imaging-confirmed unhealed fracture.", A["va"], ["nice_ta279"]),
    ("fusion", "Unstable fractures (e.g., posterior ligamentous complex disruption) or neurologic deficit needing decompression and stabilization.", A["surg"], ["cns_thoracolumbar_trauma_2019"]),
],
"lumbar_post_surgical": [
    ("pt", "Post-operative rehabilitation and for persistent post-surgical pain.", A["pt_postop_lumbar"], ["odg"]),
    ("home_exercise", "All patients after instruction.", A["hep"], ["odg"]),
    ("nsaids", "Analgesia as risk profile allows.", A["nsaid"], ["odg"]),
    ("neuropathic_agents", "Persistent neuropathic radicular pain after surgery.", A["neuro"], ["odg"]),
    ("esi_transforaminal", "Recurrent or residual radiculopathy with concordant imaging.", A["esi"], ["odg"]),
    ("esi_interlaminar", "Recurrent or residual radiculopathy; caution at the operated level.", A["esi"], ["odg"]),
    ("cbt", "Chronic post-surgical pain with psychosocial contributors; also part of SCS screening.", A["cbt"], ["odg"]),
    ("spinal_cord_stimulator", "Neuropathic (predominantly leg) pain 6 months or more despite conventional medical management, after successful trial; no further surgical target.", A["scs"], ["nice_ta159", "odg"]),
    ("functional_restoration", "Chronic disabling post-surgical pain with no surgical target.", A["frp"], ["odg"]),
    ("revision_surgery", "Identified surgical target only: pseudarthrosis, recurrent herniation, hardware failure or adjacent-segment disease concordant with symptoms.", A["surg"], ["odg"]),
],
"cervical_nonspecific_strain_sprain": [
    ("activity_modification", "All patients; stay active, reassurance, avoid prolonged collar use.", A["am"], ["jospt_neck_pain_2017", "acoem_cervical_thoracic_2018"]),
    ("home_exercise", "All phases; ROM and stretching/strengthening.", A["hep"], ["jospt_neck_pain_2017"]),
    ("pt", "Acute to chronic neck pain including WAD; exercise plus manual therapy.", A["pt"], ["jospt_neck_pain_2017", "acoem_cervical_thoracic_2018", "odg"]),
    ("manipulation", "Neck pain with mobility deficits; thoracic manipulation and cervical mobilization/manipulation; screen for vascular and instability red flags.", A["manip"], ["jospt_neck_pain_2017"]),
    ("acupuncture", "Subacute/chronic neck pain as an adjunct to active care.", A["acu"], ["odg"]),
    ("nsaids", "First-line analgesic.", A["nsaid"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("muscle_relaxants", "Acute neck pain with spasm; short course only.", A["mr"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("acetaminophen", "Alternative when NSAIDs contraindicated.", A["apap"], ["acoem_cervical_thoracic_2018"]),
    ("opioids_short_course", "Severe acute pain only when other analgesics fail.", A["opioid"], ["cdc_opioids_2022"]),
    ("trigger_point_injection", "Myofascial pain with documented trigger points, symptoms over 3 months, failed conservative care, no radiculopathy.", A["tpi"], ["odg"]),
    ("cbt", "Chronic neck pain/WAD with psychosocial risk factors.", A["cbt"], ["odg"]),
    ("functional_restoration", "Chronic disabling neck pain after failed conventional care.", A["frp"], ["odg"]),
    ("work_conditioning", "Work-related neck injury with job-demand gap after PT.", A["wc"], ["odg"]),
],
"cervical_radiculopathy": [
    ("activity_modification", "All patients; most improve without surgery.", A["am"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("home_exercise", "All phases as tolerated.", A["hep"], ["jospt_neck_pain_2017"]),
    ("pt", "Radiating neck pain: exercise plus manual therapy with intermittent traction (JOSPT); NASS found insufficient evidence for PT as stand-alone treatment.", A["pt"], ["jospt_neck_pain_2017", "odg"]),
    ("nsaids", "First-line analgesic.", A["nsaid"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("oral_steroids", "Optional short taper for acute severe radicular pain; high-quality evidence limited.", A["steroid"], ["odg"]),
    ("neuropathic_agents", "Optional for neuropathic radicular arm pain.", A["neuro"], ["odg"]),
    ("opioids_short_course", "Short course for severe acute radicular pain only.", A["opioid"], ["cdc_opioids_2022"]),
    ("esi_interlaminar", "Concordant radiculopathy not responding to conservative care; preferred cervical approach for safety.", A["esi"], ["nass_cervical_radiculopathy_2010", "odg"]),
    ("esi_transforaminal", "Selected cases only (non-particulate steroid, image guidance) given rare catastrophic neurovascular complications.", A["esi"], ["nass_cervical_radiculopathy_2010", "odg"]),
    ("acdf", "Persistent disabling radiculopathy with concordant imaging after about 6-12 weeks of failed conservative care, or progressive motor deficit.", A["surg"], ["nass_cervical_radiculopathy_2010", "odg"]),
    ("disc_arthroplasty", "Alternative to ACDF for 1-2 level soft disc/spondylotic radiculopathy without instability or significant facet arthrosis.", A["surg"], ["nass_cervical_radiculopathy_2010", "odg"]),
    ("posterior_foraminotomy", "Foraminal (posterolateral) disc or osteophyte with unilateral radiculopathy and no instability.", A["surg"], ["nass_cervical_radiculopathy_2010", "odg"]),
],
"cervical_myelopathy_stenosis": [
    ("pt", "Mild myelopathy only, as a supervised structured rehab trial with close neurologic follow-up; manipulation is contraindicated with cord compression.", "Supervised trial with serial neurologic exams (e.g., mJOA) over about 3 months; deterioration or no improvement means surgical referral, not more therapy.", ["fehlings_dcm_2017"]),
    ("nsaids", "Symptomatic neck/arm pain management alongside monitoring.", A["nsaid"], ["acoem_cervical_thoracic_2018"]),
    ("acdf", "Moderate or severe DCM, or mild DCM that fails or worsens; anterior approach for 1-3 level ventral compression.", A["surg"], ["fehlings_dcm_2017", "odg"]),
    ("laminoplasty", "Multilevel compression with preserved lordosis and minimal axial pain.", A["surg"], ["fehlings_dcm_2017"]),
    ("posterior_fusion", "Multilevel compression, kyphosis or instability requiring posterior decompression and fusion.", A["surg"], ["fehlings_dcm_2017"]),
],
"cervical_facet_degenerative": [
    ("activity_modification", "All patients.", A["am"], ["jospt_neck_pain_2017", "acoem_cervical_thoracic_2018"]),
    ("home_exercise", "All patients.", A["hep"], ["jospt_neck_pain_2017"]),
    ("pt", "Chronic axial neck pain; exercise plus manual therapy.", A["pt"], ["jospt_neck_pain_2017", "odg"]),
    ("manipulation", "Chronic neck pain with mobility deficits, no myelopathy or instability.", A["manip"], ["jospt_neck_pain_2017"]),
    ("acupuncture", "Chronic neck pain adjunct.", A["acu"], ["odg"]),
    ("nsaids", "First-line medication for flares.", A["nsaid"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("cbt", "Chronic pain with psychosocial contributors.", A["cbt"], ["odg"]),
    ("medial_branch_block", "Suspected facet pain (axial neck pain or cervicogenic headache) after about 6 weeks of failed conservative care; prognostic for RFA.", A["mbb"], ["hurley_cervical_facet_2022", "odg"]),
    ("facet_ia_injection", "Less predictive than MBB for RFA selection; limited therapeutic role.", A["facet_ia"], ["hurley_cervical_facet_2022"]),
    ("rfa", "Facet pain confirmed by positive MBB(s) in well-selected patients.", A["rfa"], ["hurley_cervical_facet_2022", "odg"]),
    ("functional_restoration", "Chronic disabling neck pain after failed conventional care.", A["frp"], ["odg"]),
],
"cervical_fracture": [
    ("spinal_orthosis", "Stable fractures or post-fixation per surgeon (rigid collar, CTO or halo).", A["orth"], ["aans_cns_cervical_sci_2013"]),
    ("acetaminophen", "Baseline analgesic.", A["apap"], ["acoem_cervical_thoracic_2018"]),
    ("nsaids", "Short-course analgesia as healing and risk profile allow.", A["nsaid"], ["acoem_cervical_thoracic_2018"]),
    ("opioids_short_course", "Severe acute fracture or post-operative pain; taper promptly.", A["opioid"], ["cdc_opioids_2022"]),
    ("pt", "After radiographic stability/healing or surgical clearance; ROM and strengthening.", "About 8-10 visits over 8-10 weeks after healing (ODG-style benchmark) or per post-surgical benchmarks; continue only with objective gains.", ["odg"]),
    ("home_exercise", "After instruction in PT.", A["hep"], ["odg"]),
    ("acdf", "Unstable subaxial injuries or cord compression suited to anterior decompression and stabilization.", A["surg"], ["aans_cns_cervical_sci_2013"]),
    ("posterior_fusion", "Unstable injuries (e.g., facet dislocation, C1-C2 instability) requiring posterior stabilization.", A["surg"], ["aans_cns_cervical_sci_2013"]),
],
"cervical_post_surgical": [
    ("pt", "Post-operative rehabilitation and for persistent post-surgical pain.", A["pt_postop_cervical"], ["odg"]),
    ("home_exercise", "All patients after instruction.", A["hep"], ["odg"]),
    ("nsaids", "Analgesia once fusion healing concerns are addressed.", A["nsaid"], ["odg"]),
    ("neuropathic_agents", "Persistent neuropathic arm pain after surgery.", A["neuro"], ["odg"]),
    ("esi_interlaminar", "Recurrent or adjacent-level radiculopathy with concordant imaging.", A["esi"], ["odg"]),
    ("cbt", "Chronic post-surgical pain with psychosocial contributors; also part of SCS screening.", A["cbt"], ["odg"]),
    ("spinal_cord_stimulator", "Refractory neuropathic arm pain 6 months or more despite conventional management, after successful trial.", A["scs"], ["nice_ta159", "odg"]),
    ("functional_restoration", "Chronic disabling post-surgical pain with no surgical target.", A["frp"], ["odg"]),
    ("revision_surgery", "Identified target only: pseudarthrosis, hardware failure, or symptomatic adjacent-segment disease with concordant imaging.", A["surg"], ["odg"]),
],
"thoracic_nonspecific_strain_sprain": [
    ("activity_modification", "All patients; thoracic-specific trials are sparse, so guidance is extrapolated from neck/low back care.", A["am"], ["acoem_cervical_thoracic_2018"]),
    ("home_exercise", "All phases.", A["hep"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("pt", "Subacute/chronic thoracic pain or acute pain not improving.", A["pt"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("manipulation", "Thoracic pain without red flags (fracture, osteoporosis, malignancy); evidence extrapolated.", A["manip"], ["odg"]),
    ("acupuncture", "Chronic thoracic pain adjunct; evidence extrapolated.", A["acu"], ["odg"]),
    ("nsaids", "First-line analgesic.", A["nsaid"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("muscle_relaxants", "Acute pain with spasm; short course.", A["mr"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("acetaminophen", "Alternative when NSAIDs contraindicated.", A["apap"], ["acoem_cervical_thoracic_2018"]),
    ("trigger_point_injection", "Myofascial pain with documented trigger points, symptoms over 3 months, failed conservative care.", A["tpi"], ["odg"]),
    ("cbt", "Chronic pain with psychosocial contributors.", A["cbt"], ["odg"]),
    ("functional_restoration", "Chronic disabling pain after failed conventional care.", A["frp"], ["odg"]),
],
"thoracic_disc_herniation_radiculopathy": [
    ("activity_modification", "All patients; most improve non-operatively.", A["am"], ["acoem_cervical_thoracic_2018"]),
    ("pt", "Initial care as tolerated; evidence extrapolated from cervical/lumbar radiculopathy.", A["pt"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("nsaids", "First-line analgesic.", A["nsaid"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("neuropathic_agents", "Optional for neuropathic intercostal radicular pain.", A["neuro"], ["odg"]),
    ("esi_interlaminar", "Concordant thoracic radiculopathy not responding to conservative care (clinical consensus; thoracic-specific evidence limited).", A["esi"], ["odg"]),
    ("thoracic_discectomy", "Rarely indicated for radiculopathy alone: intractable pain with concordant imaging after prolonged failed care, or any myelopathy.", A["surg"], ["odg"]),
],
"thoracic_myelopathy_stenosis": [
    ("pt", "Mild, stable deficits only, with close neurologic monitoring; manipulation contraindicated.", "Monitoring trial with serial neurologic exams; progression or no improvement means surgical referral, not more therapy.", ["acoem_cervical_thoracic_2018"]),
    ("thoracic_discectomy", "Myelopathy from thoracic disc herniation (clinical consensus; no dedicated evidence-based guideline identified).", A["surg"], ["odg"]),
    ("laminectomy", "Myelopathy from dorsal compression (e.g., ossified ligamentum flavum) (clinical consensus).", A["surg"], ["odg"]),
    ("fusion", "Added when decompression causes or accompanies instability or deformity (clinical consensus).", A["surg"], ["odg"]),
],
"thoracic_facet_degenerative": [
    ("activity_modification", "All patients; evidence extrapolated from neck/low back care.", A["am"], ["acoem_cervical_thoracic_2018"]),
    ("home_exercise", "All patients.", A["hep"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("pt", "Chronic axial thoracic pain.", A["pt"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("manipulation", "Without osteoporosis or other red flags; evidence extrapolated.", A["manip"], ["odg"]),
    ("nsaids", "First-line medication for flares.", A["nsaid"], ["acoem_cervical_thoracic_2018", "odg"]),
    ("cbt", "Chronic pain with psychosocial contributors.", A["cbt"], ["odg"]),
    ("functional_restoration", "Chronic disabling pain after failed conventional care.", A["frp"], ["odg"]),
],
"thoracic_fracture": [
    ("activity_modification", "Early mobilization as tolerated for stable fractures.", A["am"], ["cns_thoracolumbar_trauma_2019"]),
    ("spinal_orthosis", "Stable, neurologically intact fractures per surgeon preference (TLSO/Jewett); bracing optional per CNS 2019.", A["orth"], ["cns_thoracolumbar_trauma_2019"]),
    ("acetaminophen", "Baseline analgesic.", A["apap"], ["acoem_cervical_thoracic_2018"]),
    ("nsaids", "Short-course analgesia as healing and risk profile allow.", A["nsaid"], ["acoem_cervical_thoracic_2018"]),
    ("opioids_short_course", "Severe acute fracture or post-operative pain; taper promptly.", A["opioid"], ["cdc_opioids_2022"]),
    ("pt", "After stability/healing confirmed or post-operatively.", "About 8 visits over 10 weeks for non-operative fractures (ODG-style benchmark); continue only with objective gains.", ["odg"]),
    ("home_exercise", "After instruction in PT.", A["hep"], ["odg"]),
    ("vertebral_augmentation", "Osteoporotic compression fracture with severe ongoing pain despite optimal analgesia and imaging-confirmed unhealed fracture.", A["va"], ["nice_ta279"]),
    ("fusion", "Unstable fractures or neurologic deficit needing decompression and stabilization.", A["surg"], ["cns_thoracolumbar_trauma_2019"]),
],
}

# ----------------------------------------------------------------------------- build
def tid(base, short):
    return f"{base}_{short}"

def main():
    dx_region = {d[0]: d[1] for d in DX}
    used = {}  # treatment id -> (base, short, region)
    ladder, les = [], []
    for dx_id, rows in L.items():
        region = dx_region[dx_id]; short = REGIONS[region]
        for base, appl, adeq, srcs in rows:
            t = tid(base, short)
            used[t] = (base, short, region)
            le_id = f"le_{dx_id}__{t}"
            ladder.append({"id": le_id, "region_id": region, "canonical_dx_id": dx_id, "treatment_id": t,
                           "applicability": appl, "adequacy": adeq})
            for s in srcs:
                les.append({"ladder_entry_id": le_id, "source_id": s})

    treatments, aliases = [], []
    region_order = list(REGIONS.values())
    for t, (base, short, region) in sorted(used.items(), key=lambda kv: (region_order.index(kv[1][1]), list(CATALOG).index(kv[1][0]))):
        cat, name, generic = CATALOG[base]
        name_override, extra = REGION_EXTRAS.get((base, short), (None, []))
        treatments.append({"id": t, "region": region, "category": cat, "name": name_override or name})
        seen = set()
        for a in generic + extra:
            if a.lower() in seen:
                continue
            seen.add(a.lower())
            aliases.append({"treatmentId": t, "alias": a})

    dxs = [{"id": i, "region_id": r, "label": lab, "description": desc, "icdPrefixes": icd} for i, r, lab, desc, icd in DX]
    srcs = [{"id": i, "ref": ref, "edition": ed} for i, ref, ed in SOURCES]

    for fn, data in [("canonical_diagnoses.json", dxs), ("treatments.json", treatments), ("aliases.json", aliases),
                     ("ladder_entries.json", ladder), ("sources.json", srcs), ("ladder_entry_sources.json", les)]:
        with open(os.path.join(OUT, fn), "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"wrote {fn}: {len(data)} rows")

if __name__ == "__main__":
    main()
