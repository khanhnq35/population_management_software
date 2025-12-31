from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session
from datetime import date, datetime

from ..core.db import get_db
from ..core.dependencies import require_roles
from ..models.hogiadinh import HoGiaDinh
from ..models.nhankhau import NhanKhau
from ..models.payment import Payment
from ..models.thuphi import ThuPhi
from ..schemas.nhankhau import NhanKhauCreate, NhanKhauOut, NhanKhauUpdate
from ..schemas.payment import PaymentHistoryOut, PaymentOut
from ..services.excel_service import create_excel_file, read_excel_file

router = APIRouter(prefix="/nhankhau", tags=["nhankhau"])


@router.get("/", response_model=list[NhanKhauOut])
def list_citizens(
    status_filter: str | None = Query(default=None, description="Filter by status (thuong_tru|tam_tru|tam_vang)"),
    household_id: int | None = Query(default=None),
    household_code: str | None = Query(default=None, description="Filter by household code"),
    keyword: str | None = Query(default=None, description="Search by name, citizen code, or national id"),
    db: Session = Depends(get_db),
) -> list[NhanKhauOut]:
    query = db.query(NhanKhau)
    if status_filter:
        query = query.filter(NhanKhau.status == status_filter)
    if household_id:
        query = query.filter(NhanKhau.household_id == household_id)
    if household_code:
        query = query.join(HoGiaDinh).filter(HoGiaDinh.household_code == household_code)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (NhanKhau.full_name.ilike(like))
            | (NhanKhau.citizen_code.ilike(like))
            | (NhanKhau.national_id.ilike(like))
        )
    citizens = query.order_by(NhanKhau.created_at.desc()).all()
    return [NhanKhauOut.model_validate(c) for c in citizens]


@router.post("/", response_model=NhanKhauOut, status_code=status.HTTP_201_CREATED)
def create_citizen(
    data: NhanKhauCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> NhanKhauOut:
    # Validate household exists
    household = db.query(HoGiaDinh).filter(HoGiaDinh.id == data.household_id).first()
    if household is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    
    # Validate citizen_code is unique
    existing_citizen = db.query(NhanKhau).filter(NhanKhau.citizen_code == data.citizen_code).first()
    if existing_citizen:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Citizen code already exists")
    
    # Set household_code from household if not provided
    citizen_data = data.model_dump()
    if not citizen_data.get("household_code"):
        citizen_data["household_code"] = household.household_code
    
    citizen = NhanKhau(**citizen_data)
    db.add(citizen)
    db.commit()
    db.refresh(citizen)
    return NhanKhauOut.model_validate(citizen)


@router.get("/{citizen_id}", response_model=NhanKhauOut)
def get_citizen(citizen_id: int, db: Session = Depends(get_db)) -> NhanKhauOut:
    citizen = db.query(NhanKhau).filter(NhanKhau.id == citizen_id).first()
    if citizen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Citizen not found")
    return NhanKhauOut.model_validate(citizen)


@router.put("/{citizen_id}", response_model=NhanKhauOut)
def update_citizen(
    citizen_id: int,
    data: NhanKhauUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> NhanKhauOut:
    citizen = db.query(NhanKhau).filter(NhanKhau.id == citizen_id).first()
    if citizen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Citizen not found")
    
    update_payload = data.model_dump(exclude_unset=True)
    
    # Validate household if being updated
    if "household_id" in update_payload:
        household = db.query(HoGiaDinh).filter(HoGiaDinh.id == update_payload["household_id"]).first()
        if household is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
        # Update household_code if not explicitly provided
        if "household_code" not in update_payload:
            update_payload["household_code"] = household.household_code
    
    # Validate citizen_code uniqueness if being updated
    if "citizen_code" in update_payload:
        existing_citizen = db.query(NhanKhau).filter(
            NhanKhau.citizen_code == update_payload["citizen_code"],
            NhanKhau.id != citizen_id
        ).first()
        if existing_citizen:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Citizen code already exists")
    
    for key, value in update_payload.items():
        setattr(citizen, key, value)
    db.commit()
    db.refresh(citizen)
    return NhanKhauOut.model_validate(citizen)


@router.delete("/{citizen_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_citizen(
    citizen_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> None:
    citizen = db.query(NhanKhau).filter(NhanKhau.id == citizen_id).first()
    if citizen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Citizen not found")
    db.delete(citizen)
    db.commit()


@router.get("/{citizen_id}/payments", response_model=list[PaymentHistoryOut])
def list_citizen_payments(citizen_id: int, db: Session = Depends(get_db)) -> list[PaymentHistoryOut]:
    citizen = db.query(NhanKhau).filter(NhanKhau.id == citizen_id).first()
    if citizen is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Citizen not found")

    records = (
        db.query(Payment, ThuPhi.name.label("fee_name"))
        .join(ThuPhi, Payment.fee_id == ThuPhi.id)
        .filter(Payment.citizen_id == citizen_id)
        .order_by(Payment.payment_date.desc())
        .all()
    )

    result: list[PaymentHistoryOut] = []
    for payment, fee_name in records:
        payment_dict = PaymentOut.model_validate(payment).model_dump()
        payment_dict["fee_name"] = fee_name
        result.append(PaymentHistoryOut(**payment_dict))
    return result


@router.post("/import", status_code=status.HTTP_200_OK)
def import_citizens(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> dict[str, int]:
    """Import citizens from Excel file."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be Excel format (.xlsx or .xls)")
    
    content = file.file.read()
    data = read_excel_file(content)
    
    imported = 0
    errors = 0
    
    for row in data:
        try:
            citizen_code = str(row.get("citizen_code", "")).strip()
            if not citizen_code:
                errors += 1
                continue
            
            # Check if already exists
            existing = db.query(NhanKhau).filter(NhanKhau.citizen_code == citizen_code).first()
            if existing:
                errors += 1
                continue
            
            # Find household by code
            household_code = str(row.get("household_code", "")).strip()
            household = db.query(HoGiaDinh).filter(HoGiaDinh.household_code == household_code).first()
            if not household:
                errors += 1
                continue
            
            # Parse date
            raw_dob = row.get("date_of_birth")
            date_of_birth = None

            if raw_dob:
                if isinstance(raw_dob, date):
                    date_of_birth = raw_dob
                elif isinstance(raw_dob, datetime):
                    date_of_birth = raw_dob.date()
                elif isinstance(raw_dob, str):
                    date_of_birth = date.fromisoformat(raw_dob.split("T")[0])
                else:
                    errors += 1
                    continue
            else:
                errors += 1
                continue
            
            citizen = NhanKhau(
                citizen_code=citizen_code,
                full_name=str(row.get("full_name", "")).strip(),
                date_of_birth=date_of_birth,
                gender=str(row.get("gender", "Nam")).strip(),
                national_id=str(row.get("national_id", "")).strip() if row.get("national_id") else None,
                household_id=household.id,
                household_code=household_code,
                relationship_to_head=str(row.get("relationship_to_head", "chu_ho")).strip(),
                status=str(row.get("status", "thuong_tru")).strip(),
                birthplace=str(row.get("birthplace", "")).strip() if row.get("birthplace") else None,
                nationality=str(row.get("nationality", "Việt Nam")).strip() if row.get("nationality") else "Việt Nam",
                ethnicity=str(row.get("ethnicity", "")).strip() if row.get("ethnicity") else None,
                occupation=str(row.get("occupation", "")).strip() if row.get("occupation") else None,
                temporary_address=str(row.get("temporary_address", "")).strip() if row.get("temporary_address") else None,
            )
            db.add(citizen)
            imported += 1
        except Exception as e:
            print(f"Error: ", e)
            errors += 1
            continue
    
    db.commit()
    return {"imported": imported, "errors": errors}


@router.get("/export/excel")
def export_citizens(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> Response:
    """Export citizens to Excel file."""
    citizens = db.query(NhanKhau).order_by(NhanKhau.created_at.desc()).all()
    
    headers = [
        "citizen_code", "full_name", "household_code", "relationship_to_head",
        "date_of_birth", "gender", "national_id", "status",
        "birthplace", "nationality", "ethnicity", "occupation", "temporary_address", "created_at"
    ]
    data = [
        {
            "citizen_code": c.citizen_code,
            "full_name": c.full_name,
            "household_code": c.household_code or "",
            "relationship_to_head": c.relationship_to_head,
            "date_of_birth": c.date_of_birth.isoformat() if c.date_of_birth else "",
            "gender": c.gender,
            "national_id": c.national_id or "",
            "status": c.status,
            "birthplace": c.birthplace or "",
            "nationality": c.nationality or "",
            "ethnicity": c.ethnicity or "",
            "occupation": c.occupation or "",
            "temporary_address": c.temporary_address or "",
            "created_at": c.created_at.isoformat() if c.created_at else "",
        }
        for c in citizens
    ]
    
    excel_file = create_excel_file(headers, data)
    
    return Response(
        content=excel_file.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=citizens.xlsx"},
    )
