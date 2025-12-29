from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from datetime import date, datetime
from ..core.db import get_db
from ..core.dependencies import require_roles
from ..models.hogiadinh import HoGiaDinh
from ..schemas.hogiadinh import HoGiaDinhCreate, HoGiaDinhOut, HoGiaDinhUpdate
from ..services.excel_service import create_excel_file, read_excel_file

router = APIRouter(prefix="/hogiadinh", tags=["hogiadinh"])


@router.get("/", response_model=list[HoGiaDinhOut])
def list_households(
    keyword: str | None = Query(default=None, description="Filter by address or head of household"),
    db: Session = Depends(get_db),
) -> list[HoGiaDinhOut]:
    query = db.query(HoGiaDinh)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (HoGiaDinh.address.ilike(like)) | (HoGiaDinh.head_of_household.ilike(like)) | (HoGiaDinh.household_code.ilike(like))
        )
    households = query.order_by(HoGiaDinh.created_at.desc()).all()
    return [HoGiaDinhOut.model_validate(h) for h in households]


@router.post("/", response_model=HoGiaDinhOut, status_code=status.HTTP_201_CREATED)
def create_household(
    data: HoGiaDinhCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> HoGiaDinhOut:
    existing = db.query(HoGiaDinh).filter(HoGiaDinh.household_code == data.household_code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Household code already exists")
    household = HoGiaDinh(**data.model_dump())
    db.add(household)
    db.commit()
    db.refresh(household)
    return HoGiaDinhOut.model_validate(household)


@router.get("/{household_id}", response_model=HoGiaDinhOut)
def get_household(household_id: int, db: Session = Depends(get_db)) -> HoGiaDinhOut:
    household = db.query(HoGiaDinh).filter(HoGiaDinh.id == household_id).first()
    if household is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    return HoGiaDinhOut.model_validate(household)


@router.put("/{household_id}", response_model=HoGiaDinhOut)
def update_household(
    household_id: int,
    data: HoGiaDinhUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> HoGiaDinhOut:
    household = db.query(HoGiaDinh).filter(HoGiaDinh.id == household_id).first()
    if household is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(household, key, value)
    db.commit()
    db.refresh(household)
    return HoGiaDinhOut.model_validate(household)


@router.delete("/{household_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_household(
    household_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> None:
    household = db.query(HoGiaDinh).filter(HoGiaDinh.id == household_id).first()
    if household is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    db.delete(household)
    db.commit()


@router.post("/import", status_code=status.HTTP_200_OK)
def import_households(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> dict[str, int]:
    """Import households from Excel file."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be Excel format (.xlsx or .xls)")
    
    content = file.file.read()
    data = read_excel_file(content)
    
    imported = 0
    errors = 0
    
    for row in data:
        try:
            household_code = str(row.get("household_code", "")).strip()
            if not household_code:
                errors += 1
                continue
            raw_date = row.get("established_date")
            established_date = None

            if raw_date:
                if isinstance(raw_date, date):
                    established_date = raw_date
                elif isinstance(raw_date, str):
                    established_date = datetime.fromisoformat(raw_date.split("T")[0]).date()
            # Check if already exists
            existing = db.query(HoGiaDinh).filter(HoGiaDinh.household_code == household_code).first()
            if existing:
                errors += 1
                continue
            
            household = HoGiaDinh(  
                household_code=household_code,
                address=str(row.get("address", "")).strip(),
                head_of_household=str(row.get("head_of_household", "")).strip(),
                established_date=established_date,
            )
            db.add(household)
            imported += 1
        except Exception as e:
            print(f"Error: ", e)
            errors += 1
            continue
    
    db.commit()
    return {"imported": imported, "errors": errors}


@router.get("/export/excel")
def export_households(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> Response:
    """Export households to Excel file."""
    households = db.query(HoGiaDinh).order_by(HoGiaDinh.created_at.desc()).all()
    
    headers = ["household_code", "address", "head_of_household", "established_date", "created_at"]
    data = [
        {
            "household_code": h.household_code,
            "address": h.address,
            "head_of_household": h.head_of_household,
            "established_date": h.established_date.isoformat() if h.established_date else "",
            "created_at": h.created_at.isoformat() if h.created_at else "",
        }
        for h in households
    ]
    
    excel_file = create_excel_file(headers, data)
    
    return Response(
        content=excel_file.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=households.xlsx"},
    )
