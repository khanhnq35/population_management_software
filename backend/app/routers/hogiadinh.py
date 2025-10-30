from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.dependencies import require_roles
from ..models.hogiadinh import HoGiaDinh
from ..schemas.hogiadinh import HoGiaDinhCreate, HoGiaDinhOut, HoGiaDinhUpdate

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
