from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.dependencies import require_roles
from ..models.nhankhau import NhanKhau
from ..schemas.nhankhau import NhanKhauCreate, NhanKhauOut, NhanKhauUpdate

router = APIRouter(prefix="/nhankhau", tags=["nhankhau"])


@router.get("/", response_model=list[NhanKhauOut])
def list_citizens(
    status_filter: str | None = Query(default=None, description="Filter by status (thuong_tru|tam_tru|tam_vang)"),
    household_id: int | None = Query(default=None),
    keyword: str | None = Query(default=None, description="Search by name or national id"),
    db: Session = Depends(get_db),
) -> list[NhanKhauOut]:
    query = db.query(NhanKhau)
    if status_filter:
        query = query.filter(NhanKhau.status == status_filter)
    if household_id:
        query = query.filter(NhanKhau.household_id == household_id)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter((NhanKhau.full_name.ilike(like)) | (NhanKhau.national_id.ilike(like)))
    citizens = query.order_by(NhanKhau.created_at.desc()).all()
    return [NhanKhauOut.model_validate(c) for c in citizens]


@router.post("/", response_model=NhanKhauOut, status_code=status.HTTP_201_CREATED)
def create_citizen(
    data: NhanKhauCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles("admin", "to_truong")),
) -> NhanKhauOut:
    citizen = NhanKhau(**data.model_dump())
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
